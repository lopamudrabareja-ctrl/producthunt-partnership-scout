// Talks to the ProductHunt GraphQL API. Server-only: the token comes from .env.local / Vercel env vars.
import { z } from "zod";
import { POSTS_PER_TOPIC, WINDOW_DAYS } from "./config";
import type { RawPost } from "./pipeline";

const ENDPOINT = "https://api.producthunt.com/v2/api/graphql";

// zod = a runtime check that the API really returned the shape we expect (verified in C2).
const MakerSchema = z.object({
  name: z.string().nullable(),
  username: z.string().nullable(),
  headline: z.string().nullable(),
  url: z.string().nullable(),
});

const PostSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  votesCount: z.number(),
  commentsCount: z.number(),
  makerReplies: z.number(),
  createdAt: z.string(),
  url: z.string(),
  website: z.string().nullable(),
  topics: z.object({ edges: z.array(z.object({ node: z.object({ slug: z.string() }) })) }),
  makers: z.array(MakerSchema),
});

const ResponseSchema = z.object({
  data: z.object({ posts: z.object({ edges: z.array(z.object({ node: PostSchema })) }) }),
});

const QUERY = `
query ($topic: String!, $after: DateTime!, $first: Int!) {
  posts(topic: $topic, postedAfter: $after, order: VOTES, first: $first) {
    edges { node {
      id name tagline votesCount commentsCount makerReplies createdAt url website
      topics(first: 5) { edges { node { slug } } }
      makers { name username headline url }
    } }
  }
}`;

export class ProductHuntError extends Error {}

// Fetch the top posts (by votes) from the last 7 days for ONE topic slug.
export async function fetchTopic(topic: string, now: Date): Promise<RawPost[]> {
  const token = process.env.PRODUCTHUNT_TOKEN;
  if (!token) throw new ProductHuntError("PRODUCTHUNT_TOKEN is not set");

  const after = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: QUERY, variables: { topic, after, first: POSTS_PER_TOPIC } }),
    cache: "no-store",
  });

  if (!res.ok) {
    // 401 = bad token, 429 = rate limited. We never include the token in the message.
    throw new ProductHuntError(`ProductHunt returned HTTP ${res.status} for topic "${topic}"`);
  }
  const json = await res.json();
  if (json.errors) throw new ProductHuntError(`ProductHunt GraphQL error for topic "${topic}"`);

  const parsed = ResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ProductHuntError(`Unexpected ProductHunt response shape for topic "${topic}"`);
  }

  return parsed.data.data.posts.edges.map(({ node }) => ({
    ...node,
    topics: node.topics.edges.map((e) => e.node.slug),
  }));
}
