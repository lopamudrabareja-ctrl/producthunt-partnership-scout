import { describe, expect, it } from "vitest";
import { computeTrends } from "./trend";
import { reachLinks } from "./links";

const T0 = "2026-10-12T03:00:00Z";

describe("computeTrends", () => {
  it("returns no tags when there is no earlier run (first ever search)", () => {
    expect(computeTrends([{ id: "a", votes: 5 }], null, null).size).toBe(0);
    expect(computeTrends([{ id: "a", votes: 5 }], [], T0).size).toBe(0);
    expect(computeTrends([{ id: "a", votes: 5 }], [{ id: "b", votes: 1 }], null).size).toBe(0);
  });
  it("marks a product that was not on the previous list as new", () => {
    const t = computeTrends([{ id: "n", votes: 40 }], [{ id: "old", votes: 100 }], T0).get("n");
    expect(t).toEqual({ isNew: true, votesDelta: null, rising: false, since: T0 });
  });
  it("computes the upvote gain for a product seen before", () => {
    const t = computeTrends([{ id: "a", votes: 152 }], [{ id: "a", votes: 100 }], T0).get("a");
    expect(t?.votesDelta).toBe(52);
    expect(t?.isNew).toBe(false);
  });
  it("calls it rising only when the gain is big in absolute AND relative terms", () => {
    const prev = [{ id: "big", votes: 500 }, { id: "small", votes: 15 }, { id: "tiny", votes: 15 }];
    const cur = [{ id: "big", votes: 510 }, { id: "small", votes: 27 }, { id: "tiny", votes: 20 }];
    const m = computeTrends(cur, prev, T0);
    expect(m.get("big")?.rising).toBe(false); // +10 but only 2%
    expect(m.get("small")?.rising).toBe(true); // +12 and 80%
    expect(m.get("tiny")?.rising).toBe(false); // +5: under the minimum
  });
  it("never shows a negative change when upvotes drop", () => {
    expect(computeTrends([{ id: "a", votes: 90 }], [{ id: "a", votes: 100 }], T0).get("a")?.votesDelta).toBe(0);
  });
  it("does not divide by zero when the product had 0 upvotes before", () => {
    const t = computeTrends([{ id: "a", votes: 12 }], [{ id: "a", votes: 0 }], T0).get("a");
    expect(t?.rising).toBe(true);
    expect(Number.isFinite(t?.votesDelta ?? 0)).toBe(true);
  });
});

describe("reachLinks", () => {
  it("searches founder name plus product when the founder is known", () => {
    const l = reachLinks({ name: "Knocket", founder: { name: "Shuoxin Wang" }, websiteLink: null });
    expect(l.linkedin).toContain("keywords=Shuoxin%20Wang%20Knocket");
    expect(l.x).toContain("q=Shuoxin%20Wang%20Knocket");
  });
  it("searches 'product founder' when the founder is hidden, never inventing a name", () => {
    const l = reachLinks({ name: "Claude Haiku 5.5", founder: null, websiteLink: "https://www.producthunt.com/r/ABC" });
    expect(l.linkedin).toContain("keywords=Claude%20Haiku%205.5%20founder");
    expect(l.site).toBe("https://www.producthunt.com/r/ABC");
  });
  it("encodes special characters safely", () => {
    const l = reachLinks({ name: "A&B <Tools>", founder: null, websiteLink: null });
    expect(l.linkedin).not.toContain("<");
    expect(l.linkedin).toContain("A%26B");
  });
});
