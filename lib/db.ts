// Supabase access. Server-only: URL and key come from env vars and never reach the browser.
// Every function is "safe": if Supabase is missing or fails, it returns an empty value instead of crashing,
// so the app still works (just without cache / saved status).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Draft } from "./gemini";
import type { RankedProduct } from "./pipeline";
import { STATUSES, type Status } from "./status";

export { STATUSES };
export type { Status };

export type ScoutRow = RankedProduct & { ai: Draft | null }; // a ranked product plus its Gemini draft

export const CACHE_TTL_MS = 10 * 60 * 1000; // a run younger than 10 minutes is reused

// ---- pure helpers (unit tested) ----

// Same categories in any order = same cache key.
export function cacheKey(categoryIds: string[]): string {
  return [...new Set(categoryIds)].sort().join(",");
}

export function isFresh(createdAt: string, now: Date, ttlMs = CACHE_TTL_MS): boolean {
  const t = Date.parse(createdAt);
  return !Number.isNaN(t) && now.getTime() - t < ttlMs;
}

export function isStatus(v: unknown): v is Status {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

// ---- database calls ----

let client: SupabaseClient | null | undefined;
function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

export function dbConfigured(): boolean {
  return db() !== null;
}

export type SavedRun = { createdAt: string; results: ScoutRow[] };

// Latest saved run for these categories (any age). The caller decides if it is fresh or only a fallback.
export async function getLatestRun(key: string): Promise<SavedRun | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c
    .from("scout_runs")
    .select("created_at, results")
    .eq("categories_key", key)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return { createdAt: data[0].created_at as string, results: data[0].results as ScoutRow[] };
}

// Save a successful run (the cache) and remember every launch in the history table. Returns false on failure.
export async function saveRun(key: string, results: ScoutRow[]): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const run = await c.from("scout_runs").insert({ categories_key: key, results });
  const now = new Date().toISOString();
  const launches = await c
    .from("launches")
    .upsert(results.map((r) => ({ ph_id: r.id, name: r.name, data: r, last_seen_at: now })), { onConflict: "ph_id" });
  return !run.error && !launches.error;
}

// Current status of each product id. Anything not in the table is "new".
export async function getStatuses(ids: string[]): Promise<Map<string, Status>> {
  const out = new Map<string, Status>();
  const c = db();
  if (!c || ids.length === 0) return out;
  const { data, error } = await c.from("outreach_status").select("ph_id, status").in("ph_id", ids);
  if (error || !data) return out;
  for (const row of data) if (isStatus(row.status)) out.set(row.ph_id as string, row.status);
  return out;
}

export async function setStatus(phId: string, status: Status): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await c
    .from("outreach_status")
    .upsert({ ph_id: phId, status, updated_at: new Date().toISOString() }, { onConflict: "ph_id" });
  return !error;
}
