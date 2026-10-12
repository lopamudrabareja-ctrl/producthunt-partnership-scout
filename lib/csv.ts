// CSV export for Kavya's outreach list. Pure functions, unit tested.
import type { ResultRow } from "./types";

// Spreadsheet apps run cells starting with = + - @ as formulas. Founder names and taglines come from the
// internet, so we prefix a quote to neutralise that (CSV injection), then quote cells containing , " or newlines.
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = [
  "Rank", "Product", "Founder", "One-line description", "Upvotes", "Maker replies",
  "Days since launch", "Urgent", "Outreach angle", "Message", "ProductHunt link", "Status",
];

// `messages` holds any edits Kavya made in the UI, so the export matches what she will actually send.
export function toCsv(rows: ResultRow[], messages: Record<string, string> = {}): string {
  const lines = rows.map((r) =>
    [
      r.rank,
      r.name,
      r.founder?.name ?? "Not public (see ProductHunt profile)",
      r.ai?.oneLiner ?? r.tagline,
      r.votes,
      r.makerReplies,
      r.daysSinceLaunch,
      r.urgent ? "Yes" : "No",
      r.ai?.angle ?? "",
      messages[r.id] ?? r.ai?.message ?? "",
      r.productHuntUrl,
      r.status,
    ].map(csvCell).join(",")
  );
  return [CSV_HEADER.map(csvCell).join(","), ...lines].join("\r\n");
}
