// C2: ProductHunt reality check. Run with: npm run ph-check
// Reads PRODUCTHUNT_TOKEN from .env.local (never printed).
const URL = "https://api.producthunt.com/v2/api/graphql";
const token = process.env.PRODUCTHUNT_TOKEN;
if (!token) {
  console.error("PRODUCTHUNT_TOKEN is empty. Put it in .env.local first.");
  process.exit(1);
}

async function gql(query, variables = {}) {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors) {
    console.error("HTTP", res.status, JSON.stringify(body.errors ?? body));
    return null;
  }
  return body.data;
}

// ---------- Part 1: introspection ----------
console.log("\n=== 1. Arguments accepted by Query.posts ===");
const intro = await gql(`{
  __type(name: "Query") { fields { name args { name type { name kind ofType { name } } } } }
}`);
const postsField = intro?.__type.fields.find((f) => f.name === "posts");
for (const a of postsField?.args ?? []) {
  console.log(`  ${a.name}: ${a.type.name ?? a.type.ofType?.name} (${a.type.kind})`);
}

for (const typeName of ["Post", "User", "PostsOrder"]) {
  const t = await gql(
    `query($n:String!){ __type(name:$n){ fields{name} enumValues{name} } }`,
    { n: typeName }
  );
  const names = (t?.__type.fields ?? t?.__type.enumValues ?? []).map((x) => x.name);
  console.log(`\n=== ${typeName} fields/values ===\n  ${names.join(", ")}`);
}

// ---------- Part 2: live posts, last 7 days ----------
const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
console.log(`\n=== 2. Live posts postedAfter ${since} ===`);
const data = await gql(
  `query($after:DateTime!){
    posts(first: 20, order: VOTES, postedAfter: $after) {
      totalCount
      edges { node {
        name tagline votesCount commentsCount createdAt url website
        topics(first: 5) { edges { node { name slug } } }
        makers { name username headline twitterUsername websiteUrl url }
        comments(first: 5) { edges { node { userId isVoted user { isMaker username } } } }
      } }
    }
  }`,
  { after: since }
);
const posts = data?.posts.edges.map((e) => e.node) ?? [];
console.log(`totalCount reported: ${data?.posts.totalCount}, fetched: ${posts.length}`);

// Show 3 sample posts
for (const p of posts.slice(0, 3)) {
  console.log("\n--", p.name, "|", p.tagline);
  console.log("   votes:", p.votesCount, "comments:", p.commentsCount, "created:", p.createdAt);
  console.log("   url:", p.url, "| website:", p.website);
  console.log("   topics:", p.topics.edges.map((e) => e.node.slug).join(", "));
  console.log("   makers:", JSON.stringify(p.makers));
}

// Field fill-rate report
function filled(v) {
  // "[REDACTED]" is what ProductHunt returns for hidden user data: not a real value
  return v !== null && v !== undefined && String(v).trim() !== "" && String(v) !== "[REDACTED]";
}
const stats = {};
function count(key, v) {
  stats[key] ??= { real: 0, empty: 0, samples: new Set() };
  if (filled(v)) {
    stats[key].real++;
    if (stats[key].samples.size < 2) stats[key].samples.add(String(v).slice(0, 40));
  } else stats[key].empty++;
}
let makerCount = 0;
for (const p of posts) {
  for (const k of ["name", "tagline", "votesCount", "commentsCount", "createdAt", "url", "website"]) count(`post.${k}`, p[k]);
  count("post.topics", p.topics.edges.length ? "y" : "");
  for (const m of p.makers) {
    makerCount++;
    for (const k of ["name", "username", "headline", "twitterUsername", "websiteUrl", "url"]) count(`maker.${k}`, m[k]);
  }
}
console.log(`\n=== 3. Fill-rate (posts: ${posts.length}, makers: ${makerCount}) ===`);
for (const [k, s] of Object.entries(stats)) {
  console.log(`  ${k.padEnd(22)} real ${String(s.real).padStart(3)}  empty ${String(s.empty).padStart(3)}   e.g. ${[...s.samples].join(" | ")}`);
}

// Maker comments test
const c = posts.flatMap((p) => p.comments.edges.map((e) => e.node));
console.log(`\n=== 4. Comment author fields (sampled ${c.length} comments) ===`);
console.log("  userId filled:", c.filter((x) => filled(x.userId)).length);
console.log("  user.isMaker true:", c.filter((x) => x.user?.isMaker === true).length, "| false:", c.filter((x) => x.user?.isMaker === false).length);
console.log("  user.username filled:", c.filter((x) => filled(x.user?.username)).length);

// ---------- Part 3: other args ----------
console.log("\n=== 5. Argument tests ===");
async function test(label, q) {
  const d = await gql(q);
  console.log(`  ${label}:`, d ? `OK (${d.posts.edges.length} posts)` : "FAILED");
  return d;
}
const topicQ = await test("topic:\"productivity\"", `{ posts(first:3, topic:"productivity", postedAfter:"${since}"){ edges{node{name}} } }`);
await test("order: NEWEST", `{ posts(first:3, order:NEWEST){ edges{node{name}} } }`);
await test("order: RANKING", `{ posts(first:3, order:RANKING){ edges{node{name}} } }`);
await test("postedBefore", `{ posts(first:3, postedBefore:"${new Date().toISOString()}", postedAfter:"${since}"){ edges{node{name}} } }`);
const page = await gql(`{ posts(first:2, postedAfter:"${since}"){ pageInfo{hasNextPage endCursor} edges{node{name}} } }`);
console.log("  pagination pageInfo:", page ? JSON.stringify({ hasNextPage: page.posts.pageInfo.hasNextPage }) : "FAILED");
console.log("  topic sample:", JSON.stringify(topicQ?.posts.edges.map((e) => e.node.name)));

// ---------- Part 4: maker comments probe ----------
console.log("\n=== 6. makerReplies / Comment introspection ===");
const mr = await gql(`{ __type(name:"Post"){ fields{ name args{name} type{ name kind ofType{ name } } } } }`);
const f = mr?.__type.fields.find((x) => x.name === "makerReplies");
console.log("  Post.makerReplies type:", JSON.stringify(f?.type), "args:", f?.args.map((a) => a.name).join(","));
const cm = await gql(`{ __type(name:"Comment"){ fields{ name } } }`);
console.log("  Comment fields:", cm?.__type.fields.map((x) => x.name).join(", "));
const mrq = await gql(`{ posts(first:10, order:VOTES, postedAfter:"${since}"){ edges{ node{ name commentsCount makerReplies } } } }`);
if (mrq) for (const e of mrq.posts.edges) console.log(`  ${e.node.name.slice(0,28).padEnd(28)} commentsCount=${e.node.commentsCount} makerReplies=${JSON.stringify(e.node.makerReplies)}`);

// redacted counts for makers
const rd = {}; let tot = 0;
for (const p of posts) for (const m of p.makers) { tot++; for (const k of ["name","username","url"]) if (m[k] === "[REDACTED]") rd[k] = (rd[k] ?? 0) + 1; }
console.log("\n=== 7. Makers with [REDACTED] fields (of", tot, ") ===", JSON.stringify(rd));
const postsAllRedacted = posts.filter((p) => p.makers.length && p.makers.every((m) => m.name === "[REDACTED]")).length;
const postsNoUsableMaker = posts.filter((p) => !p.makers.some((m) => m.name !== "[REDACTED]")).length;
console.log("  posts where EVERY maker is redacted:", postsAllRedacted, "of", posts.length);
console.log("  posts with at least one named maker:", posts.length - postsNoUsableMaker, "of", posts.length);
