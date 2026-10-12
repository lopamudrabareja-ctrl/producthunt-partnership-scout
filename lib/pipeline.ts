// Pure functions only: data in, data out. No network, no clock (the caller passes `now`).
// That makes every step unit-testable and easy to explain.
import { URGENT_FROM_DAY, WEIGHTS, WINDOW_DAYS } from "./config";

export type RawMaker = {
  name: string | null;
  username: string | null;
  headline: string | null;
  url: string | null;
};

export type RawPost = {
  id: string;
  name: string;
  tagline: string;
  votesCount: number;
  commentsCount: number;
  makerReplies: number;
  createdAt: string;
  url: string;
  website: string | null;
  topics: string[];
  makers: RawMaker[];
  categories?: string[]; // which of Kavya's categories this post matched
};

export type Founder = { name: string; headline: string | null; profileUrl: string | null };

export type RankedProduct = {
  rank: number;
  id: string;
  name: string;
  tagline: string;
  votes: number;
  commentsCount: number;
  makerReplies: number;
  daysSinceLaunch: number;
  urgent: boolean;
  score: number;
  founder: Founder | null; // null = no named maker, never guessed
  productHuntUrl: string;
  websiteLink: string | null; // a ProductHunt redirect link, not the real domain
  topics: string[];
  categories: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const REDACTED = "[REDACTED]";

// ProductHunt returns the literal string "[REDACTED]" instead of null for hidden users.
function isRealText(v: string | null | undefined): v is string {
  return typeof v === "string" && v.trim() !== "" && v !== REDACTED;
}

// Drop the "?utm_..." tracking part so links are clean to show and copy.
export function cleanUrl(url: string | null | undefined): string | null {
  if (!isRealText(url)) return null;
  return url.split("?")[0];
}

// Whole days since launch, never negative.
export function daysSinceLaunch(createdAt: string, now: Date): number {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return WINDOW_DAYS; // unparseable date: treat as oldest, never crash
  return Math.max(0, Math.floor((now.getTime() - t) / DAY_MS));
}

// First maker whose name is real. If every maker is redacted, return null (never invent a name).
export function pickFounder(makers: RawMaker[]): Founder | null {
  const m = makers.find((x) => isRealText(x.name));
  if (!m || !isRealText(m.name)) return null;
  return {
    name: m.name,
    headline: isRealText(m.headline) ? m.headline : null,
    profileUrl: cleanUrl(m.url),
  };
}

// The same product can appear under several topics: merge into one, combining topics and categories.
export function dedupe(posts: RawPost[]): RawPost[] {
  const byId = new Map<string, RawPost>();
  for (const p of posts) {
    const existing = byId.get(p.id);
    if (!existing) {
      byId.set(p.id, { ...p, topics: [...p.topics], categories: [...(p.categories ?? [])] });
    } else {
      existing.topics = [...new Set([...existing.topics, ...p.topics])];
      existing.categories = [...new Set([...(existing.categories ?? []), ...(p.categories ?? [])])];
    }
  }
  return [...byId.values()];
}

// Keep only launches from the last WINDOW_DAYS days (the API filter is not trusted on its own).
export function withinWindow(posts: RawPost[], now: Date): RawPost[] {
  return posts.filter((p) => {
    const d = daysSinceLaunch(p.createdAt, now);
    return d <= WINDOW_DAYS && Date.parse(p.createdAt) <= now.getTime() + DAY_MS;
  });
}

// votes and replies are on different scales, so each is divided by the best in the batch (0..1).
// Dividing by max = 0 would give NaN, so an all-zero batch scores 0 for that metric.
function norm(value: number, max: number): number {
  return max > 0 ? value / max : 0;
}

export function rankPosts(posts: RawPost[], now: Date): RankedProduct[] {
  if (posts.length === 0) return [];
  const maxVotes = Math.max(...posts.map((p) => p.votesCount));
  const maxReplies = Math.max(...posts.map((p) => p.makerReplies));

  const scored = posts.map((p) => {
    const days = daysSinceLaunch(p.createdAt, now);
    const freshness = Math.max(0, (WINDOW_DAYS - days) / WINDOW_DAYS); // 1 = launched today, 0 = a week old
    const score =
      WEIGHTS.votes * norm(p.votesCount, maxVotes) +
      WEIGHTS.makerReplies * norm(p.makerReplies, maxReplies) +
      WEIGHTS.freshness * freshness;
    return { p, days, score };
  });

  // Ties are broken by votes, then by name, so the order is identical on every run.
  scored.sort(
    (a, b) => b.score - a.score || b.p.votesCount - a.p.votesCount || a.p.name.localeCompare(b.p.name)
  );

  return scored.map(({ p, days, score }, i) => ({
    rank: i + 1,
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    votes: p.votesCount,
    commentsCount: p.commentsCount,
    makerReplies: p.makerReplies,
    daysSinceLaunch: days,
    urgent: days >= URGENT_FROM_DAY,
    score: Math.round(score * 1000) / 1000,
    founder: pickFounder(p.makers),
    productHuntUrl: cleanUrl(p.url) ?? p.url,
    websiteLink: cleanUrl(p.website),
    topics: p.topics,
    categories: p.categories ?? [],
  }));
}

// The whole no-AI pipeline in one call.
export function buildRankedList(raw: RawPost[], now: Date, limit: number): RankedProduct[] {
  return rankPosts(withinWindow(dedupe(raw), now), now).slice(0, limit);
}
