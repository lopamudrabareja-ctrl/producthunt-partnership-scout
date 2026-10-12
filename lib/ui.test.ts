import { describe, expect, it } from "vitest";
import { csvCell, toCsv, CSV_HEADER } from "./csv";
import { daysLeft, filledSegments, timeAgo, windowLabel } from "./format";
import type { ResultRow } from "./types";

function row(over: Partial<ResultRow> = {}): ResultRow {
  return {
    rank: 1, id: "1", name: "Alpha", tagline: "A tagline", votes: 10, commentsCount: 3, makerReplies: 2,
    daysSinceLaunch: 5, urgent: true, score: 0.5, founder: { name: "Ada Lovelace", headline: null, profileUrl: null },
    productHuntUrl: "https://www.producthunt.com/products/alpha", websiteLink: null, topics: [], categories: [],
    ai: { oneLiner: "One liner", angle: "An angle", message: "Hi Ada,\n\nHello, \"friend\".\n\nBest,\nKavya" },
    status: "new", ...over,
  };
}

describe("csvCell", () => {
  it("leaves plain text alone", () => expect(csvCell("hello")).toBe("hello"));
  it("quotes cells with commas, quotes and newlines, doubling inner quotes", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });
  it("neutralises spreadsheet formulas (CSV injection)", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")").startsWith("\"'=")).toBe(true);
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("-5")).toBe("'-5");
  });
  it("turns null and undefined into empty cells", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
  it("keeps numbers", () => expect(csvCell(42)).toBe("42"));
});

describe("toCsv", () => {
  it("has a header and one line per product", () => {
    const lines = toCsv([row(), row({ id: "2", rank: 2, name: "Beta" })]).split("\r\n");
    expect(lines[0]).toBe(CSV_HEADER.join(","));
    expect(lines).toHaveLength(3);
  });
  it("uses Kavya's edited message instead of the original", () => {
    expect(toCsv([row()], { "1": "My edited text" })).toContain("My edited text");
    expect(toCsv([row()], { "1": "My edited text" })).not.toContain("Hello");
  });
  it("says the founder is not public when there is none, and never invents a name", () => {
    expect(toCsv([row({ founder: null })])).toContain("Not public (see ProductHunt profile)");
  });
  it("falls back to the tagline and empty angle when there is no AI draft", () => {
    const line = toCsv([row({ ai: null })]).split("\r\n")[1];
    expect(line).toContain("A tagline");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-12T12:00:00Z");
  const ago = (s: number) => new Date(now.getTime() - s * 1000).toISOString();
  it("handles seconds, minutes, hours, days", () => {
    expect(timeAgo(ago(20), now)).toBe("just now");
    expect(timeAgo(ago(180), now)).toBe("3 min ago");
    expect(timeAgo(ago(3 * 3600), now)).toBe("3 hr ago");
    expect(timeAgo(ago(3 * 86400), now)).toBe("3 days ago");
  });
  it("copes with garbage and future dates", () => {
    expect(timeAgo("nope", now)).toBe("unknown time");
    expect(timeAgo(ago(-100), now)).toBe("just now");
  });
});

describe("launch window helpers", () => {
  it("counts days left in the 7-day window", () => {
    expect(daysLeft(0)).toBe(7);
    expect(daysLeft(5)).toBe(2);
    expect(daysLeft(7)).toBe(0);
    expect(daysLeft(12)).toBe(0);
    expect(daysLeft(-3)).toBe(7);
  });
  it("words the label sensibly", () => {
    expect(windowLabel(2)).toBe("5 days left");
    expect(windowLabel(6)).toBe("1 day left");
    expect(windowLabel(7)).toBe("Window closes today");
  });
  it("fills as many segments as full days elapsed, so filled + days left = 7", () => {
    expect(filledSegments(0)).toBe(0);
    expect(filledSegments(5)).toBe(5);
    expect(filledSegments(9)).toBe(7);
    for (const d of [0, 1, 3, 5, 7]) expect(filledSegments(d) + daysLeft(d)).toBe(7);
  });
});
