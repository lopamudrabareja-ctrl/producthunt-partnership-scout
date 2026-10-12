// The AI layer. Gemini Flash only (never the Claude API). Gemini writes LANGUAGE, never the ranking (D8).
// Server-only: the key comes from .env.local / Vercel env vars and never reaches the browser.
import { z } from "zod";
import { AI_TOP_N } from "./config";
import { PROFILE } from "./profile";
import type { RankedProduct } from "./pipeline";

export const GEMINI_TIMEOUT_MS = 20_000; // per model; three models = at most 60s, inside the route's 90s limit
export { AI_TOP_N }; // only the top 10 go to Gemini: cheaper, faster, fewer rate-limit problems

export type Draft = { oneLiner: string; angle: string; message: string };

// zod re-checks what Gemini returned. If it breaks the format, we drop it instead of showing garbage.
const DraftItemSchema = z.object({
  id: z.string(),
  oneLiner: z.string().min(1),
  angle: z.string().min(1),
  message: z.string().min(1),
});
const DraftListSchema = z.array(DraftItemSchema);

const SYSTEM_PROMPT = `You help a partnerships lead write first-contact notes to founders of newly launched software products.
Hard rules:
- Use ONLY the facts given in the input. Never invent features, customers, numbers, funding, or people.
- Never write a person's name, greeting, or sign-off. The message is the BODY only: the app adds "Hi <name>," and the sign-off.
- Do not claim you used or tested their product. Be honest and brief.
- oneLiner: max 18 words, plain description of what the product does, based on its tagline.
- angle: max 25 words, how the sender's product complements theirs (a partnership idea, not a sales pitch).
- message: 50 to 80 words, warm and specific, mentions the launch, proposes a short call. No emojis.
Return one object per input product, using the exact same id.`;

// Only public ProductHunt fields are sent. No private data.
export function buildUserPrompt(products: RankedProduct[]): string {
  const items = products.map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    topics: p.topics,
    daysSinceLaunch: p.daysSinceLaunch,
  }));
  return `Sender's product: ${PROFILE.productDescription}
Sender's goal: ${PROFILE.partnerGoal}

Products to write for (JSON):
${JSON.stringify(items)}`;
}

// The app, not the model, writes the greeting. So a founder name can never be invented.
export function composeMessage(body: string, product: Pick<RankedProduct, "name" | "founder">): string {
  const first = product.founder?.name.trim().split(/\s+/)[0];
  const greeting = first ? `Hi ${first},` : `Hi ${product.name} team,`;
  return `${greeting}\n\n${body.trim()}\n\nBest,\n${PROFILE.senderName}`;
}

// Turn Gemini's text into validated drafts keyed by product id. Unknown ids and bad shapes are dropped.
export function parseDrafts(text: string, products: RankedProduct[]): Map<string, Draft> {
  const result = new Map<string, Draft>();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return result;
  }
  const parsed = DraftListSchema.safeParse(json);
  if (!parsed.success) return result;
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const item of parsed.data) {
    const product = byId.get(item.id);
    if (!product || result.has(item.id)) continue;
    result.set(item.id, {
      oneLiner: item.oneLiner.trim(),
      angle: item.angle.trim(),
      message: composeMessage(item.message, product),
    });
  }
  return result;
}

export class GeminiError extends Error {}

// Models to try, in order. New Gemini models are often overloaded (seen in testing: hangs of 50s+),
// so if the first one times out or is busy we fall back to the next. Model ids live in env vars.
export function modelsToTry(): string[] {
  const primary = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  // GEMINI_FALLBACK_MODEL may hold one id or a comma-separated list, tried in order after the primary.
  const fallbacks = (process.env.GEMINI_FALLBACK_MODEL || "gemini-3.6-flash,gemini-3.5-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([primary, ...fallbacks])];
}

// One attempt on one model. Returns the text, or throws GeminiError(retryable) so the caller can try the next model.
class ModelUnavailable extends GeminiError {}

async function callModel(model: string, key: string, body: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body,
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
  } catch {
    throw new ModelUnavailable(`${model} timed out or was unreachable`);
  }
  if (res.ok) {
    const data = await res.json();
    const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((p) => !p.thought && p.text).map((p) => p.text).join("");
    if (!text) throw new ModelUnavailable(`${model} returned no text`);
    return text;
  }
  // 429 = rate limit, 5xx = overloaded, 404 = model not available to this key: try the next model.
  if (res.status === 429 || res.status >= 500 || res.status === 404) {
    throw new ModelUnavailable(`${model} returned HTTP ${res.status}`); // the key is never included
  }
  throw new GeminiError(`Gemini returned HTTP ${res.status}`); // 400/401/403: a real problem, do not retry
}

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY is not set");

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            oneLiner: { type: "STRING" },
            angle: { type: "STRING" },
            message: { type: "STRING" },
          },
          required: ["id", "oneLiner", "angle", "message"],
        },
      },
    },
  });

  const problems: string[] = [];
  for (const model of modelsToTry()) {
    try {
      return await callModel(model, key, body);
    } catch (e) {
      if (!(e instanceof ModelUnavailable)) throw e;
      problems.push(e.message);
    }
  }
  throw new GeminiError(`All Gemini models failed: ${problems.join("; ")}`);
}

// ONE batched call for all products. Throws GeminiError on failure; the caller falls back to "no AI text".
export async function generateDrafts(products: RankedProduct[]): Promise<Map<string, Draft>> {
  if (products.length === 0) return new Map();
  const text = await callGemini(buildUserPrompt(products));
  return parseDrafts(text, products);
}
