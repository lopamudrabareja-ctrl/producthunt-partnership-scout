import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./cron";

describe("isAuthorizedCron", () => {
  it("accepts the exact bearer secret", () => expect(isAuthorizedCron("Bearer s3cret", "s3cret")).toBe(true));
  it("rejects a wrong secret", () => expect(isAuthorizedCron("Bearer nope", "s3cret")).toBe(false));
  it("rejects a missing header", () => expect(isAuthorizedCron(null, "s3cret")).toBe(false));
  it("rejects everyone when the secret is not configured", () => {
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
    expect(isAuthorizedCron("Bearer undefined", undefined)).toBe(false);
  });
  it("rejects the secret without the Bearer prefix, and different lengths", () => {
    expect(isAuthorizedCron("s3cret", "s3cret")).toBe(false);
    expect(isAuthorizedCron("Bearer s3cretX", "s3cret")).toBe(false);
  });
});
