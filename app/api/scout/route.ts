// GET /api/scout?categories=hr-tech,project-management   (no param = all four categories)
// Order follows the Components Map: cache check -> ProductHunt -> rank (no AI) -> Gemini (top 10) -> save -> return.
//   &refresh=1  skip the cache and fetch live       &ai=0  skip Gemini (fast, uses no quota, never cached)
//   &saved=1    return the latest saved run of ANY age without fetching (used on first page load; the daily cron keeps it fresh)
import type { NextRequest } from "next/server";
import { ALL_CATEGORY_IDS, CATEGORIES, MAX_RESULTS, type CategoryId } from "@/lib/config";
import { cacheKey, dbConfigured, getLatestRun, getStatuses, isFresh, saveRun, type ScoutRow } from "@/lib/db";
import { AI_TOP_N, generateDrafts, type Draft } from "@/lib/gemini";
import { buildRankedList, type RawPost } from "@/lib/pipeline";
import { fetchTopic } from "@/lib/producthunt";

// Allow up to 90s: ProductHunt (~2s) + Gemini (up to 30s per model, two models tried).
export const maxDuration = 90;

type Source = "live" | "cache" | "stale";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const requested = params.get("categories");
  const ids = requested ? requested.split(",").map((s) => s.trim()).filter(Boolean) : ALL_CATEGORY_IDS;

  const unknown = ids.filter((id) => !(id in CATEGORIES));
  if (unknown.length > 0) {
    return Response.json(
      { error: `Unknown categories: ${unknown.join(", ")}`, valid: ALL_CATEGORY_IDS },
      { status: 400 }
    );
  }

  const now = new Date();
  const key = cacheKey(ids);
  const warnings: string[] = [];
  const wantAi = params.get("ai") !== "0";
  if (!dbConfigured()) warnings.push("Database not configured: no caching and no saved status");

  // Attach each product's saved outreach status (default "new") and send the response.
  async function respond(results: ScoutRow[], source: Source, aiStatus: string, cachedAt: string | null) {
    const statuses = await getStatuses(results.map((r) => r.id));
    return Response.json({
      generatedAt: cachedAt ?? now.toISOString(),
      source, // "live" = just fetched, "cache" = reused a recent run, "stale" = ProductHunt down, last saved run shown
      categories: ids,
      count: results.length,
      aiStatus,
      results: results.map((r) => ({ ...r, status: statuses.get(r.id) ?? "new" })),
      warnings,
    });
  }

  // 1. Cache check: a saved run under 10 minutes old for the same categories is reused.
  const latest = await getLatestRun(key);

  // Saved-results mode: show the most recent run (e.g. this morning's cron run) without touching ProductHunt or Gemini.
  if (params.get("saved") === "1") {
    if (!latest) return Response.json({ error: "No saved results yet" }, { status: 404 });
    return respond(latest.results, "cache", "ok", latest.createdAt);
  }
  if (latest && wantAi && params.get("refresh") !== "1" && isFresh(latest.createdAt, now)) {
    return respond(latest.results, "cache", "ok", latest.createdAt);
  }

  // 2. Cache miss: fetch from ProductHunt. One failing topic must not kill the run (allSettled).
  const jobs = (ids as CategoryId[]).flatMap((cat) => CATEGORIES[cat].topics.map((topic) => ({ cat, topic })));
  const fetched = await Promise.allSettled(jobs.map((j) => fetchTopic(j.topic, now)));

  const raw: RawPost[] = [];
  const phWarnings: string[] = [];
  fetched.forEach((r, i) => {
    if (r.status === "fulfilled") raw.push(...r.value.map((p) => ({ ...p, categories: [jobs[i].cat] })));
    else phWarnings.push(r.reason instanceof Error ? r.reason.message : "Unknown error");
  });
  warnings.push(...phWarnings);

  // Every topic failed: show the last saved run (any age) with a stale flag, else a clear error.
  if (raw.length === 0 && phWarnings.length === jobs.length) {
    if (latest) {
      warnings.push("ProductHunt is unreachable: showing the last saved results");
      return respond(latest.results, "stale", "ok", latest.createdAt);
    }
    return Response.json({ error: "Could not reach ProductHunt", warnings }, { status: 502 });
  }

  // 3. Rank in plain code, then 4. Gemini writes language for the top N only.
  const ranked = buildRankedList(raw, now, MAX_RESULTS);
  let aiStatus: "ok" | "failed" | "skipped" = "skipped";
  const drafts = new Map<string, Draft>();
  if (wantAi && ranked.length > 0) {
    try {
      (await generateDrafts(ranked.slice(0, AI_TOP_N))).forEach((d, id) => drafts.set(id, d));
      aiStatus = "ok";
    } catch (e) {
      aiStatus = "failed";
      warnings.push(`AI drafts unavailable: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }
  const rows: ScoutRow[] = ranked.map((r) => ({ ...r, ai: drafts.get(r.id) ?? null }));

  // 5. Save only a complete run (Gemini succeeded), so a cached result never hides the AI text.
  if (aiStatus === "ok" && dbConfigured()) {
    if (!(await saveRun(key, rows))) warnings.push("Could not save this run to the database");
  }

  return respond(rows, "live", aiStatus, null);
}
