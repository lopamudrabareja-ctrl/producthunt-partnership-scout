import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildUserPrompt, composeMessage, generateDrafts, GeminiError, modelsToTry, parseDrafts } from "./gemini";
import type { RankedProduct } from "./pipeline";

function product(over: Partial<RankedProduct> = {}): RankedProduct {
  return {
    rank: 1, id: "1", name: "Knocket", tagline: "Chat with visitors", votes: 100, commentsCount: 5, makerReplies: 2,
    daysSinceLaunch: 1, urgent: false, score: 0.5, founder: { name: "Shuoxin Wang", headline: null, profileUrl: null },
    productHuntUrl: "https://www.producthunt.com/products/knocket", websiteLink: null, topics: ["messaging"], categories: [], ...over,
  };
}

describe("composeMessage (the app writes the greeting, not the AI)", () => {
  it("greets the founder by first name", () => {
    expect(composeMessage("Body.", product()).startsWith("Hi Shuoxin,")).toBe(true);
  });
  it("greets the product team when there is no named founder", () => {
    const msg = composeMessage("Body.", product({ founder: null }));
    expect(msg.startsWith("Hi Knocket team,")).toBe(true);
  });
  it("adds the sign-off", () => expect(composeMessage("Body.", product()).endsWith("Best,\nKavya")).toBe(true));
});

describe("buildUserPrompt", () => {
  it("sends only public product fields, not founder names", () => {
    const prompt = buildUserPrompt([product()]);
    expect(prompt).toContain("Knocket");
    expect(prompt).not.toContain("Shuoxin"); // founder name is never sent to the model
    expect(prompt).not.toContain("producthunt.com");
  });
});

describe("parseDrafts", () => {
  const good = JSON.stringify([{ id: "1", oneLiner: "One.", angle: "Angle.", message: "Body text." }]);
  it("parses valid JSON and composes the full message", () => {
    const m = parseDrafts(good, [product()]);
    expect(m.get("1")?.oneLiner).toBe("One.");
    expect(m.get("1")?.message).toContain("Hi Shuoxin,");
  });
  it("returns nothing for invalid JSON", () => expect(parseDrafts("not json", [product()]).size).toBe(0));
  it("returns nothing when the shape is wrong", () => {
    expect(parseDrafts(JSON.stringify([{ id: "1", oneLiner: "x" }]), [product()]).size).toBe(0);
  });
  it("ignores ids that were not in the input", () => {
    const text = JSON.stringify([{ id: "999", oneLiner: "a", angle: "b", message: "c" }]);
    expect(parseDrafts(text, [product()]).size).toBe(0);
  });
});

describe("generateDrafts (network faked)", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "test-model");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const okBody = {
    candidates: [{ content: { parts: [{ text: JSON.stringify([{ id: "1", oneLiner: "o", angle: "a", message: "m" }]) }] } }],
  };
  const reply = (status: number, body: unknown = {}) => ({ ok: status < 400, status, json: async () => body }) as Response;

  it("returns drafts on success with ONE fetch call for the whole batch", async () => {
    const f = vi.fn().mockResolvedValue(reply(200, okBody));
    vi.stubGlobal("fetch", f);
    const out = await generateDrafts([product()]);
    expect(out.size).toBe(1);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("falls back to the second model after a 429 and then succeeds", async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(429)).mockResolvedValueOnce(reply(200, okBody));
    vi.stubGlobal("fetch", f);
    expect((await generateDrafts([product()])).size).toBe(1);
    expect(f).toHaveBeenCalledTimes(2);
    expect(String(f.mock.calls[0][0])).toContain("test-model");
    expect(String(f.mock.calls[1][0])).toContain("gemini-3.6-flash");
  });

  it("falls back when the first model times out (network error)", async () => {
    const f = vi.fn().mockRejectedValueOnce(new DOMException("timeout", "TimeoutError")).mockResolvedValueOnce(reply(200, okBody));
    vi.stubGlobal("fetch", f);
    expect((await generateDrafts([product()])).size).toBe(1);
  });

  it("falls back on 503 overload and on 404 model-not-available", async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(404)).mockResolvedValueOnce(reply(200, okBody));
    vi.stubGlobal("fetch", f);
    expect((await generateDrafts([product()])).size).toBe(1);
  });

  it("fails with a GeminiError listing every model when all of them fail, and never leaks the key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(503)));
    const err = await generateDrafts([product()]).catch((e) => e);
    expect(err).toBeInstanceOf(GeminiError);
    expect(err.message).toContain("test-model");
    expect(err.message).toContain("gemini-3.6-flash");
    expect(err.message).not.toContain("test-key");
  });

  it("does not try another model for a 401 (bad key is a real problem)", async () => {
    const f = vi.fn().mockResolvedValue(reply(401));
    vi.stubGlobal("fetch", f);
    await expect(generateDrafts([product()])).rejects.toThrow("HTTP 401");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("makes no call at all for an empty list", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect((await generateDrafts([])).size).toBe(0);
    expect(f).not.toHaveBeenCalled();
  });

  it("fails clearly when the key is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(generateDrafts([product()])).rejects.toThrow("GEMINI_API_KEY is not set");
  });
});

describe("modelsToTry", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("uses env models, primary first", () => {
    vi.stubEnv("GEMINI_MODEL", "a");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "b");
    expect(modelsToTry()).toEqual(["a", "b"]);
  });
  it("accepts a comma-separated fallback list and keeps its order", () => {
    vi.stubEnv("GEMINI_MODEL", "a");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "b, c ,d");
    expect(modelsToTry()).toEqual(["a", "b", "c", "d"]);
  });
  it("has two built-in fallbacks when none is configured", () => {
    vi.stubEnv("GEMINI_MODEL", "a");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "");
    expect(modelsToTry()).toEqual(["a", "gemini-3.6-flash", "gemini-3.5-flash-lite"]);
  });
  it("does not list the same model twice", () => {
    vi.stubEnv("GEMINI_MODEL", "a");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "a");
    expect(modelsToTry()).toEqual(["a"]);
  });
});
