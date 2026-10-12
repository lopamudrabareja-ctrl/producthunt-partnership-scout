# CLAUDE.md — ProductHunt Partnership Scout
(Project root file. Claude Code: read this first every session. Keep it updated.)
Status: v1 — built and deployed. Last updated: 2026-10-12.

## 1. Who / what / when
- Student: Lopa, Mesa School of Business, Cohort C4, "AI and its Applications" (Prof. Divij Bajaj) — Term 1 Final Evaluation.
- Build deadline: EOD 12 Oct 2026. Viva: 15 Oct 2026, 2–8 PM. Student must be able to explain EVERY decision (what / why / alternatives / what breaks if skipped). When building, explain choices in plain language.
- Problem: **ProductHunt Partnership Scout** — Medium difficulty, B2B, Partnerships & Growth.

## 2. The problem (from the booklet)
Kavya leads partnerships at a B2B SaaS company that helps remote teams run async standups. She must find newly launched tools in adjacent categories (project management, HR tech, developer productivity, team communication) and reach their founders within 7 days of launch (founders are excited and want distribution partners; after day 7 it gets harder). She manually scrolls ProductHunt every morning (30–40 min) and still misses launches.

Required: automation that queries ProductHunt for tools launched in the last 7 days in specified categories, scores each by **upvote count** and **number of maker comments** (responsiveness signal), and generates a **ranked outreach list**. Each row MUST have: product name, founder name, one-line description, upvote count, days since launch, suggested outreach angle (how Kavya's product complements theirs). Task: build and deploy an AI-powered scout that delivers this list on demand.

## 3. Hard rules (exam)
- LIVE external data (ProductHunt API); must work with real data at submission.
- ALL AI tasks use **Gemini Flash**. Never use the Claude API inside the product.
- Deploy on **Vercel**. Submit: public URL + GitHub repo + Components Map.
- Free tools only; prefer tools taught in class.

## 4. Grading
Exam = 100 marks: Build 60% + Viva 40%.
Build 60 = Components Map 10, Working Vercel link 10, Design 10, Backend logic & build quality 25, Demo video 5.
Medium is judged on: scoping correctly, reliable outputs, edge cases, demonstrating it works. A strong working Medium beats a half-working Hard. >80% needed for Advanced AI (Term 2). Final AI grade weight 40%; MRS 10%.

## 5. Course frameworks to follow (taught by prof — mirror these in the build & viva)
- **Cheapest model that does the job** (rule of thumb, Lecture 2) -> Gemini Flash.
- **5 parts of every app** (Lecture 2): Frontend, Backend, API(s), Database, Version control. Our project must map cleanly onto these.
- **Secrets rules (Lecture 2)**: (1) keys only in `.env`/`.env.local`, never in code/chat/docs; (2) `.env*` in `.gitignore` BEFORE first push; (3) if a key leaks, rotate immediately. Add same env vars manually in Vercel dashboard. Never commit keys.
- **Automation Brief + Nine Checks + The Cut** (Lectures 3–4, Case 3 brief): Pain/User/Outcome, Journey Today, then 9 checks (Kill switches 01 Problem real, 02 Workflow repeated, 03 Input available; Sizing 04 Output valuable, 05 Impact measurable, 08 ROI worth it; Boundary 06 Failure risk OK, 07 Judgment protected, 09 Owner clear), then "The Cut" = what the client asked for that we deliberately did NOT build and which check stopped it. Principle: automate the workflow, NOT the human's consequential judgment; human review gate must be visible.
- **Components Map format (graded 10%)**: swimlane table, columns Actor | Trigger | Input | Context | Processing | AI | Output; rows = actors (Kavya/User, System/App Backend, ProductHunt API, AI Models (Gemini), Database); boxes placed in the cell where that actor does that function; dashed arrows with dot at each handoff; human gate visible. (Style reference: Case 2 "Hiring Dashboard — Components Map".)
- **Data privacy block** (Lecture 4): Gemini free tier may use inputs to improve Google's models; billed API does not. Our inputs are public PH data + Kavya's product blurb (no personal/private data) -> acceptable; say this in viva. Founder names are public PH profile data.
- Build workflow taught: design/spec in Claude Chat first (no code) -> Claude Code builds the whole project -> keys in env -> push GitHub -> import in Vercel -> add env vars -> deploy -> test with small sample first, then full.

## 6. Decisions log
| # | Decision | Why | Alternatives rejected | Risk if skipped |
|---|----------|-----|----------------------|-----------------|
| D1 | Attempt **Medium**, polished | Working Medium > half Hard; need >80% | Hard | Half-built Hard scores lower |
| D2 | Follow problem statement literally: Kavya's company is the fixed user; her product profile lives in ONE config file (`lib/profile.ts`) | Matches grader expectation; cheap to swap | Multi-tenant settings UI | n/a |
| D3 | Extras: copy-ready outreach message, CSV export, urgency flag (launch day 5–7), founder links | Make it usable in real outreach | Auto-send emails, auth | Output is just a list |
| D4 | Student has PH token + Gemini key | — | — | — |
| D5 | **Stack = free + taught**: Claude Code, Gemini Flash, Supabase, Vercel, GitHub (+ Resend optional). Only non-taught piece is ProductHunt API (required by problem; free token) | Student constraint | Paid tools; Redis/other DBs | — |
| D6 | **Supabase stores scouted launches + outreach status + cached results** (NOT in-memory cache) | CORRECTION: Vercel serverless doesn't reliably keep memory between requests, so in-memory caching would silently fail. DB gives cache + history + pipeline tracking (New -> Contacted -> Replied) — real-world useful | In-memory cache | Cache doesn't work; Kavya re-sees same products daily |
| D7 | **Human stays in the loop**: tool drafts messages; Kavya reviews and sends herself. No auto-outreach | Course pattern (Nine Checks 06/07/09, The Cut): a wrong auto-message to a founder can't be unsent; Kavya owns the relationship | Auto-send via Resend/LinkedIn | Liability, spammy outreach |
| D9 | **Daily Vercel Cron** (`/api/cron`, 03:00 UTC, secret-protected) + page shows latest saved run on first load. Added 12 Oct 2026 at the student's request (student believes cron/live-data refresh is graded; not found in the booklet, to confirm with instructor) | Keeps data live without a click; first visit is instant | No schedule (on-demand only) | Wrong/missing secret would let strangers burn Gemini quota: route refuses everyone if CRON_SECRET is unset |
| D8 | **Ranking is deterministic code; Gemini only writes language** | Reliable, explainable, same result each run | AI ranks everything | Unreliable/unexplainable order |

## 7. Architecture (maps to the "5 parts of every app")
- Frontend: Next.js (App Router, TS) + Tailwind — category chips, "Find partners" button, ranked table, copy/CSV buttons, status dropdown per row.
- Backend: Next.js API route `/api/scout` (server only; keys never reach browser).
- External APIs: ProductHunt GraphQL API v2 (data) ; Gemini Flash (language).
- Database: Supabase (tables: launches, outreach_status, scout_runs/cache).
- Version control/deploy: GitHub -> Vercel (env vars: PRODUCTHUNT_TOKEN, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY / service key server-side).
Pipeline: fetch last-7-days posts per topic -> normalise/dedupe/compute daysSinceLaunch/handle missing founder -> score -> Gemini on top ~10 only (strict JSON) -> store in Supabase -> return ranked list + urgency flag + founder links.
Validation: zod on PH data and Gemini JSON. Edge cases: no results, missing maker, API error/rate limit (show last cached result + banner), Gemini failure (still show ranked list without AI text), duplicate products across topics.

## 7b. API facts (VERIFIED by live test on 12 Oct 2026 with `npm run ph-check`, scripts/ph-check.mjs)
ProductHunt API v2:
- GraphQL endpoint `https://api.producthunt.com/v2/api/graphql`; header `Authorization: Bearer <developer token>`. Developer token works for public reads. (Redirect URI on the app form must be HTTPS; it is unused because we never do the OAuth login flow.)
- Terms: by default API "must not be used for commercial purposes" -> OK for coursework; a commercial rollout needs permission from PH (hello@producthunt.com). Rate limits not numeric ("fair use") -> cache in Supabase, fetch sparingly.
- Volume: ~6,150 posts launched in the last 7 days overall (1,010 developer-tools, 1,751 productivity), so we must filter by topic and use `first` + `order: VOTES`, not fetch everything.

**Query arguments on `posts` (from introspection, all tested OK):**
| Argument | Works? | Notes |
|---|---|---|
| `postedAfter`, `postedBefore` (DateTime, ISO) | YES | Use `postedAfter = now - 7 days` |
| `topic` (String, a topic SLUG) | YES | Must be an exact slug; a wrong slug silently returns 0 posts (no error) |
| `order` (enum) | YES | FEATURED_AT, VOTES, RANKING, NEWEST |
| `first` / `after` (Int / cursor) | YES | `pageInfo.hasNextPage` + `endCursor` for paging |
| `featured`, `twitterUrl`, `url`, `before`, `last` | exist | not needed |

**Topic slugs for Kavya's categories (posts in last 7 days):** developer-tools 1010, productivity 1751, task-management 104 (use for project management), human-resources 26, hiring 79 (HR tech), messaging 101, meetings 42, customer-communication 33, remote-work 31 (team communication). NOT valid (return 0): project-management, team-collaboration, collaboration, recruiting.

**Fields: real vs empty vs redacted (20 posts, 108 makers sampled):**
| Field | Result |
|---|---|
| post: name, tagline, votesCount, commentsCount, createdAt, url, website, topics | ALWAYS present (20/20) |
| post.makerReplies | Present, Int. **This is the maker-comment signal** (e.g. 30 of 66 comments) |
| maker.name / username / url | Present for only ~19% (20 of 108); the other ~81% are the literal string `"[REDACTED]"` |
| maker.headline | Present for ~17% (18/108); else null (also null for redacted makers) |
| maker.twitterUsername, maker.websiteUrl | Almost always null (3 of 108) |
| post with at least one named maker | 19 of 20 (no post had ALL makers redacted in this sample) |

**Gotchas that change the design:**
1. `"[REDACTED]"` is a normal-looking string, not null. Code must treat it as missing (otherwise it would show "[REDACTED]" as a founder name). Pick the first maker whose name is not "[REDACTED]"; if none, show "see PH profile" + post url. Never invent a name.
2. `post.url` and `maker.url` contain tracking params (`utm_...Application: Partnership Scout`). Harmless; can strip the query string for display.
3. `post.website` is a ProductHunt redirect link (`producthunt.com/r/...`), NOT the product's real domain. Use it as "visit product" link only; do not parse a domain from it.
4. Maker comments: do NOT count via `comments{ user{ isMaker } }` (isMaker was false for all 99 sampled comments and usernames are redacted = unreliable). Use `makerReplies` instead. `commentsCount` = all comments.
5. `featuredAt` / dailyRank exist on Post but are not used.

Gemini:
- Model IDs change. Official models page (12 Oct 2026) lists `gemini-3.8-flash` (stable, newest), `gemini-3.6-flash`; `gemini-2.5-flash` is legacy (restricted to past users); `gemini-2.0-flash` shut down. -> Put model ID in env var `GEMINI_MODEL` (default `gemini-3.8-flash`); student confirms in Google AI Studio which model her key can call. Free-tier limits NOT verified — handle 429 errors gracefully (retry once, then show list without AI text).

## 8. Scoring (proposed, pending student OK)
Normalise each metric against the best in the batch (0–1): score = 0.6*votes_norm + 0.4*makerReplies_norm + small freshness bonus (makerReplies is a real field, verified in 7b). Weights live in config. Reason: votes and comments are on different scales; maker comments = responsiveness signal asked for in the problem.

## 9. Nine Checks (draft for viva / README)
01 Problem real: YES — 30–40 min daily manual scroll, misses launches. 02 Workflow repeated: YES — daily. 03 Input available: YES — PH API, live. 04 Output valuable: YES — ranked actionable list + messages. 05 Impact measurable: YES — minutes saved/day, products surfaced, outreach within 7 days. 06 Failure risk OK: YES for ranking/drafting; NO for auto-sending. 07 Judgment protected: YES — Kavya reviews/sends. 08 ROI: YES — free-tier stack, saves ~3 hrs/week. 09 Owner clear: YES — Kavya owns every message.
The Cut: NOT built = auto-sending outreach to founders (checks 06, 09). Built instead = drafts for Kavya to review.

## 10. Open items
- Confirm scoring weights (60/40 + freshness).
- Verify PH API: which fields available (makers, commentsCount, topics, website/social links), rate limits, and ToS (non-commercial OK for coursework).
- Decide on optional Resend: email Kavya the daily digest (taught tool, free) — stretch only.
- Deliverables to produce: Components Map (swimlane image), README with Automation Brief + Nine Checks + The Cut + plain-words walkthrough. Demo video dropped by the student on 12 Oct 2026 (the booklet lists it as 5 marks: student to confirm this is allowed).

## 11. Build plan & status (course-style checkpoints; each has a DONE WHEN)
**C1 — Setup.** Next.js + Tailwind + TS project, `.env.local` (PRODUCTHUNT_TOKEN, GEMINI_API_KEY, GEMINI_MODEL, SUPABASE_URL, SUPABASE_ANON_KEY), `.gitignore` includes `.env*`. DONE WHEN: app runs locally and `git status` shows no env file.
**C2 — PH reality check.** One script/route that fetches posts from the last 7 days and prints name, votes, commentsCount, createdAt, makers fields, topics. DONE WHEN: we know exactly which fields are real vs redacted, and which query arguments work. Record findings in section 7b.
**C3 — Pipeline core (no AI).** Fetch -> filter 7 days & chosen topics -> dedupe -> daysSinceLaunch -> score -> ranked JSON. Unit tests for scoring + edge cases (empty list, missing maker, ties). DONE WHEN: `/api/scout` returns a correct ranked list from live data.
**C4 — Gemini layer.** Top ~10 only; ONE batched call returning strict JSON {id, oneLiner, angle, message}; zod validation; fallback if Gemini fails. Kavya's product profile in `lib/profile.ts`. DONE WHEN: every row has a sensible angle & message that never invents facts (use only PH fields).
**C5 — Supabase.** Tables: launches, outreach_status (new/contacted/replied/skip), cache of last run. DONE WHEN: refresh within 10 min reuses cache; status changes persist after reload.
**C6 — UI & extras.** Category chips, table, urgency badge (day 5–7), copy message, CSV export, founder links, loading/empty/error states. DONE WHEN: Kavya can go from click to a copied message in under 1 minute.
**C7 — Deploy.** Push to GitHub -> import in Vercel -> add env vars in dashboard -> deploy. DONE WHEN: public URL shows live data with no errors.
**C8 — Deliverables.** Components Map (swimlane), README (Automation Brief + Nine Checks + The Cut + plain-words walkthrough). Demo video dropped by the student on 12 Oct 2026. DONE WHEN: README matches the code and the Q&A covers every decision.
Status: C1 DONE. C2 DONE (findings in 7b). Components Map v1 built (docs/components-map.html + .png). C3 DONE (lib/config.ts, lib/pipeline.ts, lib/producthunt.ts, app/api/scout/route.ts, 23 unit tests passing, live test OK: 20 ranked results in ~2s). Scoring confirmed by student: 60% votes + 40% makerReplies + 5% freshness. C4 DONE (lib/profile.ts, lib/gemini.ts; 37 unit tests; live test OK: 10 drafts from ONE gemini-3.8-flash call, all greetings/lengths verified; fallback verified when Gemini timed out). C5 DONE (lib/db.ts, supabase/schema.sql, app/api/status/route.ts; 50 unit tests; 10 live tests passed). C6 DONE (components/Scout.tsx, components/ResultRow.tsx, lib/csv.ts, lib/format.ts, lib/status.ts, lib/types.ts; 61 unit tests; production build OK; lint clean; UI exercised live in browser). C7 DONE: live at https://producthunt-partnership-scout.vercel.app (12 Oct 2026; live-tested: live data, Gemini drafts, cache, status, saved mode, cron route returns 401 without secret). Deployment saga: Vercel had a git/build outage; a CRON_SECRET with a trailing newline (from `openssl | pbcopy`) made builds fail in 2s ('contains leading or trailing whitespace') - regenerate with `| tr -d '\n'`; a PRODUCTHUNT_TOKEN switched to Secret via Edit saved an empty value - delete and re-add instead. C8 written (README). Cron added (lib/cron.ts, app/api/cron/route.ts, vercel.json; 66 tests).
