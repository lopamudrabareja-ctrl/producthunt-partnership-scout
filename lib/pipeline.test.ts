import { describe, expect, it } from "vitest";
import {
  buildRankedList,
  cleanUrl,
  daysSinceLaunch,
  dedupe,
  pickFounder,
  rankPosts,
  withinWindow,
  type RawMaker,
  type RawPost,
} from "./pipeline";

const NOW = new Date("2026-10-12T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString();

const named: RawMaker = { name: "Ceyhun Cakir", username: "ceyhun", headline: "Co-founder", url: "https://www.producthunt.com/@ceyhun?utm_source=x" };
const redacted: RawMaker = { name: "[REDACTED]", username: "[REDACTED]", headline: null, url: "[REDACTED]" };

function post(over: Partial<RawPost> = {}): RawPost {
  return {
    id: "1", name: "Alpha", tagline: "t", votesCount: 100, commentsCount: 10, makerReplies: 5,
    createdAt: daysAgo(1), url: "https://www.producthunt.com/products/alpha?utm_source=x",
    website: "https://www.producthunt.com/r/ABC?utm_source=x", topics: ["developer-tools"], makers: [named],
    ...over,
  };
}

describe("daysSinceLaunch", () => {
  it("counts whole days", () => expect(daysSinceLaunch(daysAgo(3.5), NOW)).toBe(3));
  it("is 0 for a launch today", () => expect(daysSinceLaunch(daysAgo(0.2), NOW)).toBe(0));
  it("never goes negative for future timestamps", () => expect(daysSinceLaunch(daysAgo(-1), NOW)).toBe(0));
});

describe("pickFounder", () => {
  it("returns the first named maker", () => {
    expect(pickFounder([redacted, named])?.name).toBe("Ceyhun Cakir");
  });
  it("returns null when every maker is redacted (never invents a name)", () => {
    expect(pickFounder([redacted, redacted])).toBeNull();
  });
  it("returns null when there are no makers", () => expect(pickFounder([])).toBeNull());
  it("returns null for blank or null names", () => {
    expect(pickFounder([{ ...named, name: "  " }, { ...named, name: null }])).toBeNull();
  });
  it("strips tracking params from the profile url and treats [REDACTED] url as missing", () => {
    expect(pickFounder([named])?.profileUrl).toBe("https://www.producthunt.com/@ceyhun");
    expect(pickFounder([{ ...named, url: "[REDACTED]" }])?.profileUrl).toBeNull();
  });
});

describe("cleanUrl", () => {
  it("removes the query string", () => expect(cleanUrl("https://a.com/x?utm=1")).toBe("https://a.com/x"));
  it("returns null for null / [REDACTED]", () => {
    expect(cleanUrl(null)).toBeNull();
    expect(cleanUrl("[REDACTED]")).toBeNull();
  });
});

describe("dedupe", () => {
  it("merges the same product found under two topics", () => {
    const out = dedupe([
      post({ id: "7", topics: ["messaging"], categories: ["team-communication"] }),
      post({ id: "7", topics: ["meetings"], categories: ["team-communication", "hr-tech"] }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].topics.sort()).toEqual(["meetings", "messaging"]);
    expect(out[0].categories?.sort()).toEqual(["hr-tech", "team-communication"]);
  });
  it("keeps different products separate", () => {
    expect(dedupe([post({ id: "1" }), post({ id: "2" })])).toHaveLength(2);
  });
});

describe("withinWindow", () => {
  it("drops launches older than 7 days and keeps the rest", () => {
    const out = withinWindow([post({ id: "a", createdAt: daysAgo(2) }), post({ id: "b", createdAt: daysAgo(9) })], NOW);
    expect(out.map((p) => p.id)).toEqual(["a"]);
  });
  it("drops posts with an invalid date instead of crashing", () => {
    expect(withinWindow([post({ createdAt: "not-a-date" })], NOW)).toHaveLength(0);
  });
});

describe("rankPosts", () => {
  it("returns an empty list for empty input", () => expect(rankPosts([], NOW)).toEqual([]));

  it("applies 60% votes + 40% maker replies + freshness", () => {
    // A has all the votes, B has all the replies. 0.6 > 0.4, so A must win.
    const a = post({ id: "A", name: "A", votesCount: 200, makerReplies: 0, createdAt: daysAgo(3) });
    const b = post({ id: "B", name: "B", votesCount: 0, makerReplies: 50, createdAt: daysAgo(3) });
    const out = rankPosts([b, a], NOW);
    expect(out.map((r) => r.name)).toEqual(["A", "B"]);
    // freshness for 3 days old = (7-3)/7 * 0.05
    expect(out[0].score).toBeCloseTo(0.6 + 0.05 * (4 / 7), 3);
    expect(out[1].score).toBeCloseTo(0.4 + 0.05 * (4 / 7), 3);
  });

  it("does not produce NaN when every post has 0 votes and 0 replies", () => {
    const out = rankPosts([post({ id: "1", votesCount: 0, makerReplies: 0 }), post({ id: "2", name: "B", votesCount: 0, makerReplies: 0 })], NOW);
    expect(out.every((r) => Number.isFinite(r.score))).toBe(true);
  });

  it("breaks exact ties by votes, then by name, the same on every run", () => {
    const x = post({ id: "x", name: "Zed", votesCount: 10, makerReplies: 10 });
    const y = post({ id: "y", name: "Abe", votesCount: 10, makerReplies: 10 });
    expect(rankPosts([x, y], NOW).map((r) => r.name)).toEqual(["Abe", "Zed"]);
    expect(rankPosts([y, x], NOW).map((r) => r.name)).toEqual(["Abe", "Zed"]);
  });

  it("assigns rank numbers starting at 1 and flags urgency from day 5", () => {
    const out = rankPosts([post({ id: "1", createdAt: daysAgo(6) }), post({ id: "2", name: "B", votesCount: 1, createdAt: daysAgo(1) })], NOW);
    expect(out.map((r) => r.rank)).toEqual([1, 2]);
    const byName = Object.fromEntries(out.map((r) => [r.name, r.urgent]));
    expect(byName).toEqual({ Alpha: true, B: false });
  });

  it("shows a null founder for a post whose makers are all redacted", () => {
    const out = rankPosts([post({ makers: [redacted] })], NOW);
    expect(out[0].founder).toBeNull();
  });

  it("gives a clean product url without tracking params", () => {
    expect(rankPosts([post()], NOW)[0].productHuntUrl).toBe("https://www.producthunt.com/products/alpha");
  });
});

describe("buildRankedList", () => {
  it("dedupes, filters old posts, ranks and applies the limit", () => {
    const raw = [
      post({ id: "1", name: "A", votesCount: 300 }),
      post({ id: "1", name: "A", votesCount: 300 }), // duplicate
      post({ id: "2", name: "B", votesCount: 100 }),
      post({ id: "3", name: "Old", votesCount: 999, createdAt: daysAgo(20) }), // outside window
    ];
    const out = buildRankedList(raw, NOW, 1);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("A");
  });
  it("returns an empty list when nothing is in the window", () => {
    expect(buildRankedList([post({ createdAt: daysAgo(30) })], NOW, 10)).toEqual([]);
  });
});
