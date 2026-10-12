import { describe, expect, it } from "vitest";
import { cacheKey, isFresh, isStatus } from "./db";

const NOW = new Date("2026-10-12T12:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60000).toISOString();

describe("cacheKey", () => {
  it("is the same for the same categories in any order", () => {
    expect(cacheKey(["hr-tech", "project-management"])).toBe(cacheKey(["project-management", "hr-tech"]));
  });
  it("ignores duplicates", () => expect(cacheKey(["a", "a", "b"])).toBe("a,b"));
  it("differs for different category sets", () => expect(cacheKey(["a"])).not.toBe(cacheKey(["a", "b"])));
});

describe("isFresh (10 minute cache)", () => {
  it("is fresh at 9 minutes", () => expect(isFresh(minutesAgo(9), NOW)).toBe(true));
  it("is stale at exactly 10 minutes", () => expect(isFresh(minutesAgo(10), NOW)).toBe(false));
  it("is stale at an hour", () => expect(isFresh(minutesAgo(60), NOW)).toBe(false));
  it("treats an invalid date as stale instead of crashing", () => expect(isFresh("garbage", NOW)).toBe(false));
});

describe("isStatus", () => {
  it("accepts the four allowed statuses", () => {
    for (const s of ["new", "contacted", "replied", "skip"]) expect(isStatus(s)).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isStatus("sent")).toBe(false);
    expect(isStatus(null)).toBe(false);
    expect(isStatus(1)).toBe(false);
  });
});
