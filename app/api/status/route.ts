// POST /api/status   body: { "id": "<ProductHunt post id>", "status": "contacted" }
// Saves Kavya's outreach status so it survives a page reload.
import { z } from "zod";
import { dbConfigured, setStatus, STATUSES } from "@/lib/db";

const BodySchema = z.object({ id: z.string().min(1), status: z.enum(STATUSES) });

export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Expected { id, status }", validStatuses: STATUSES }, { status: 400 });
  }
  if (!dbConfigured()) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }
  const ok = await setStatus(body.data.id, body.data.status);
  if (!ok) return Response.json({ error: "Could not save status" }, { status: 500 });
  return Response.json({ ok: true, id: body.data.id, status: body.data.status });
}
