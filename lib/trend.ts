// "What changed since your last check": compares the current run with the previous saved run. Pure functions.
import { RISING_MIN_DELTA, RISING_MIN_SHARE } from "./config";

export type Trend = {
  isNew: boolean; // not on the previous list (so: new to the list, not necessarily launched since)
  votesDelta: number | null; // upvotes gained since the previous run; null when the product is new
  rising: boolean;
  since: string; // when the previous run happened, for "+52 since 6 hr ago"
};

type Item = { id: string; votes: number };

export function computeTrends(
  current: Item[],
  previous: Item[] | null | undefined,
  previousAt: string | null | undefined
): Map<string, Trend> {
  const out = new Map<string, Trend>();
  // No earlier run to compare with (first ever search): no tags at all, rather than calling everything "new".
  if (!previous || previous.length === 0 || !previousAt) return out;

  const before = new Map(previous.map((p) => [p.id, p.votes]));
  for (const c of current) {
    const was = before.get(c.id);
    if (was === undefined) {
      out.set(c.id, { isNew: true, votesDelta: null, rising: false, since: previousAt });
      continue;
    }
    const delta = Math.max(0, c.votes - was); // upvotes can be removed; we only show gains
    const rising = delta >= RISING_MIN_DELTA && delta / Math.max(was, 1) >= RISING_MIN_SHARE;
    out.set(c.id, { isNew: false, votesDelta: delta, rising, since: previousAt });
  }
  return out;
}
