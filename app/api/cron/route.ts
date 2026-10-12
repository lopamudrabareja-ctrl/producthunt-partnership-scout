// GET /api/cron   Called once a day by Vercel Cron (schedule in vercel.json).
// It runs the SAME scout as the "Find partners" button, but with refresh=1, so fresh live ProductHunt data and
// Gemini drafts are saved to Supabase. Kavya's first visit then shows them straight away.
import { NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { GET as runScout } from "../scout/route";

export const maxDuration = 90;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Reuse the scout handler instead of copying its logic: one code path to test and explain.
  const inner = new NextRequest(new URL("/api/scout?refresh=1", request.url));
  const res = await runScout(inner);
  const body = await res.json();

  if (!res.ok) {
    return Response.json({ ok: false, error: body.error ?? "Scout failed", warnings: body.warnings ?? [] }, { status: 502 });
  }
  return Response.json({
    ok: true,
    ranAt: new Date().toISOString(),
    count: body.count,
    source: body.source,
    aiStatus: body.aiStatus,
    warnings: body.warnings,
  });
}
