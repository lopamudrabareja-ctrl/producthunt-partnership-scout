# ProductHunt Partnership Scout

An AI-assisted tool that finds tools launched on ProductHunt in the last 7 days, ranks them, and drafts a first-contact message for each founder. The user reviews, edits and sends every message herself.

- **Live app:** https://producthunt-partnership-scout.vercel.app
- **GitHub repo:** https://github.com/lopamudrabareja-ctrl/producthunt-partnership-scout
- **Components Map:** [docs/components-map.html](docs/components-map.html) (image: [docs/components-map.png](docs/components-map.png))
- **Built for:** Mesa School of Business, Cohort C4, AI and its Applications, Term 1 Final Evaluation (Problem: ProductHunt Partnership Scout, Medium)

---

## What it is, in plain words

Every morning Kavya used to scroll ProductHunt for 30 to 40 minutes to find newly launched tools worth partnering with. This app does that search for her on demand.

**How to use it (4 steps):**
1. Pick one or more categories (project management, HR tech, developer productivity, team communication) and click **Find partners**.
2. Read the ranked table. Each row shows the product, its founder, a one-line description, upvotes, how many days ago it launched, and a suggested angle for a partnership. Launches on day 5 or later carry an **Urgent** badge because the 7-day outreach window is closing.
3. Click **Review message** on any of the top 10 to read, edit and copy a ready-made first message. The app never sends anything; Kavya sends it herself.
4. Set each product's status (New, Contacted, Replied, Skip). It is saved, so it is still there after a reload. **Export CSV** gives the list to her team.

**What the app decides, and what it leaves to a person:** the app finds, ranks and drafts. A person decides whom to contact, edits the wording and sends it.

---

## 1. Automation Brief

**User:** Kavya, who leads partnerships at a B2B SaaS company that helps remote teams run async standups.

**Pain:** Founders are most open to distribution partners in the first 7 days after launch. To find them, Kavya scrolls ProductHunt by hand every morning (30 to 40 minutes, per the case brief), and still misses launches.

**Outcome wanted:** A ranked outreach list on demand. Each row has the product name, founder name, one-line description, upvotes, days since launch, and a suggested outreach angle that explains how Kavya's product complements theirs.

**Journey today (manual):** open ProductHunt, scroll the day's launches, open each product, work out what it does, find the founder, decide whether it is relevant, think of an angle, write a message, track who was contacted somewhere else.

**Journey with the scout:** pick categories, click **Find partners**, scan a ranked table (urgent launches flagged), open a draft, edit it, copy it, send it herself, mark the status.

## 2. The Nine Checks

| # | Check | Verdict | Why |
|---|---|---|---|
| 01 | Problem is real | Yes | A 30 to 40 minute daily scroll that still misses launches |
| 02 | Workflow repeats | Yes | Every day |
| 03 | Input is available | Yes | ProductHunt GraphQL API, live and free (verified with a real token) |
| 04 | Output is valuable | Yes | A ranked, actionable list with drafts |
| 05 | Impact is measurable | Yes | Minutes saved per day, products surfaced, share contacted inside 7 days (targets, not yet measured) |
| 06 | Failure risk is acceptable | Yes for ranking and drafting, **No for auto-sending** | A wrong message to a founder cannot be unsent |
| 07 | Human judgment is protected | Yes | Kavya reviews and edits every message |
| 08 | ROI is worth it | Yes | Free-tier stack; saves roughly 3 hours a week |
| 09 | Owner is clear | Yes | Kavya owns every message and relationship |

## 3. The Cut (what was asked for or possible, and deliberately not built)

- **Auto-sending outreach to founders.** Stopped by checks 06 and 09. The tool drafts; Kavya sends.
- **Guessing founder names or emails.** ProductHunt hides about 80% of maker names. We show a link to the ProductHunt page instead of inventing anything.
- **Multi-user accounts and login.** Out of scope for a single-user tool (see the security note below).

## 4. How it works

```
Once a day: Vercel Cron -> /api/cron (secret-protected) -> same flow with refresh, result saved
Kavya opens the page -> latest saved result shown instantly
Kavya clicks "Find partners"
  -> /api/scout (server only; keys never reach the browser)
     1. Cache check in Supabase (same categories, under 10 minutes old -> reuse)
     2. ProductHunt GraphQL: top posts of the last 7 days per topic
     3. Plain code: dedupe, days since launch, treat "[REDACTED]" as missing, score, rank
     4. Gemini Flash: ONE batched call for the top 10 -> strict JSON drafts
     5. Save the run and launches to Supabase
  -> ranked table; Kavya edits, copies, sends, and sets a status (saved in Supabase)
```

**Scoring (plain code, not AI):** `score = 0.6 x votes + 0.4 x makerReplies + 0.05 x freshness`, each metric divided by the best in the batch. Ties are broken by votes, then name, so the order is the same on every run. Weights live in `lib/config.ts`.

**What Gemini does and does not do:** it writes language only (one-liner, partnership angle, message body). It never ranks, and it never writes a person's name: the app adds the greeting ("Hi Ishu," or "Hi Knocket team,") and the sign-off. Founder names are not even sent to the model.

The five parts of an app:

| Part | Where |
|---|---|
| Frontend | Next.js (App Router, TypeScript) and Tailwind: `app/page.tsx`, `components/` |
| Backend | `app/api/scout/route.ts`, `app/api/status/route.ts` |
| APIs | ProductHunt GraphQL v2 (data), Gemini Flash (language) |
| Database | Supabase: `scout_runs` (cache), `launches` (history), `outreach_status` (pipeline) |
| Version control | GitHub, deployed on Vercel |

**Scheduled refresh (Vercel Cron):** `vercel.json` schedules `/api/cron` daily at 03:00 UTC (about 8:30 in India; the free Hobby plan allows one run a day and may drift by up to an hour). The route runs the same scout with a refresh and saves it, so the data stays live without anyone clicking, and the page shows the latest saved result on first load. `/api/cron` refuses any call that does not carry `CRON_SECRET`; if the secret is not set, nobody is allowed.

## 5. Reliability and edge cases

| Situation | Behaviour |
|---|---|
| Maker hidden by ProductHunt (`[REDACTED]`) | Treated as missing; shows "Not public: see ProductHunt page" |
| Same product under two topics | Merged into one row |
| One ProductHunt topic fails | The others still return, with a warning |
| ProductHunt is down | Shows the last saved run, flagged as stale |
| ProductHunt is down and nothing is saved | Clear error with a Try again button |
| Gemini slow, overloaded or rate limited | Falls back to a second model; if that fails too, the ranked list still shows, with a notice |
| Database missing or failing | The app still works, without cache or saved status |
| Empty results, or no urgent launches | Dedicated empty states |
| Cron called without the secret | 401, nothing runs |
| CSV export | Cells starting with `=`, `+`, `-` or `@` are neutralised (CSV injection) |

## 6. ProductHunt API facts (tested, not assumed)

- `posts` accepts `postedAfter`, `postedBefore`, `topic` (exact slug), `order` (`VOTES`, `NEWEST`, `RANKING`, `FEATURED_AT`), `first` and `after`. A wrong topic slug silently returns 0 posts.
- About 81% of maker records come back as `"[REDACTED]"`. `makerReplies` (an integer on each post) is the maker-responsiveness signal; comment-author fields are unreliable.
- `website` is a ProductHunt redirect link, not the product's real domain.
- Terms: the API is for non-commercial use by default, which suits coursework. A commercial rollout would need ProductHunt's permission.

Full details are in section 7b of [CLAUDE.md](CLAUDE.md).

## 7. Data privacy

Gemini receives only public ProductHunt fields (name, tagline, topics, days since launch) and Kavya's product description. No personal or private data. On Google's free tier, inputs may be used to improve its models; this is acceptable for public data and should be revisited on a paid tier.

## 8. Security notes

- Secrets live only in `.env.local` (git-ignored) and in Vercel environment variables. They are never in the code or the repo.
- Supabase Row Level Security is on, with policies for the `anon` role. **Trade-off:** anyone holding the anon key could read or write these tables. That is acceptable here because the key is only used on the server, the data is public ProductHunt information plus a status word, and the tool is single-user. A multi-user product would add login and per-user policies.

## 9. Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in your own values
npm run dev                  # http://localhost:3000   (add ?run=1 to start a search automatically)
npm test                     # 61 unit tests
npm run ph-check             # prints which ProductHunt fields are real, empty or redacted
```

Environment variables (see `.env.example`): `PRODUCTHUNT_TOKEN`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` (optional), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CRON_SECRET` (for the daily scheduled run).

Create the database tables by running [supabase/schema.sql](supabase/schema.sql) once in the Supabase SQL editor.

## 10. Known limitations (honest list)

- Founder names are often unavailable because ProductHunt hides them.
- `makerReplies` counts replies, not their quality.
- A fresh run takes about 8 to 20 seconds (mostly Gemini); a repeat within 10 minutes is instant.
- The Copy button and CSV download were checked by fallback behaviour and unit tests, not by every browser.
- Impact numbers (time saved) are targets from the case brief, not measured results.
