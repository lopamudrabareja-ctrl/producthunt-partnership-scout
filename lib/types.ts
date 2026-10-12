// The shape of what /api/scout returns, shared by the server route and the browser UI.
import type { ScoutRow } from "./db";
import type { Status } from "./status";

export type ResultRow = ScoutRow & { status: Status };

export type ScoutResponse = {
  generatedAt: string;
  source: "live" | "cache" | "stale";
  categories: string[];
  count: number;
  aiStatus: "ok" | "failed" | "skipped";
  results: ResultRow[];
  warnings: string[];
};
