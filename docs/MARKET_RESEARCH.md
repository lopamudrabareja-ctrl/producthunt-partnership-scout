# Market research: does a "Kavya" exist, and what would help her?

_Done 12 Oct 2026 from public sources (job postings, vendor guides, product pages). No interviews were held, and many numbers come from vendors selling outreach tools, so treat every percentage as a rough guide, not a fact._

## 1. What the exam asks for (so research stays on target)
- **Medium** is judged on: scoping the problem correctly, reliable outputs, edge cases, and showing that it works. More features do not earn marks by themselves.
- Build marks: Components Map 10, Vercel link 10, Design 10, Backend logic and build quality 25, Demo video 5 (the professor has since said the demo video is not required).
- The brief says Kavya "still misses things": launches that arrived after she checked, and products that **gained traction later in the day**. It also wants maker comments used as a "responsiveness" signal, and the output on demand.
- Nothing in the rubric or the brief mentions a scheduled job or cron.

## 2. Does a person like Kavya exist? Yes
Job postings for "Partnerships Manager" and "Partner Manager" at B2B SaaS companies describe the same job:
- **Find and recruit** integration, agency and platform partners, from cold outreach to onboarding; map the market and keep a prioritised target list by category.
- **Coordinate integrations** with product and engineering.
- **Manage relationships**: check-ins, quarterly reviews, co-marketing, referral programmes.
- **Report** results and feed partner and market feedback to product and leadership.
- Typical profile: 2 to 5 years in partnerships, BD or channel sales; tools listed include HubSpot, Apollo and Clay.

Her daily ProductHunt scroll is the "finding" slice of that job: a small, repetitive, time-sensitive task sitting on top of much bigger relationship work. That is exactly the kind of task worth automating, and exactly the part a human should not hand over (the relationship).

## 3. Her likely problems
| Problem | Evidence |
|---|---|
| Time lost on repetitive scanning, and still missing things | The brief itself |
| Timing: the first week matters, and response fades quickly | Vendor guides claim outreach works best 7 to 14 days after a launch and that response drops fast after a signal. Unverified, but consistent with the brief. |
| Generic outreach gets very low replies | Cold email replies of roughly 3 to 6%; personalised or trigger-based messages reportedly several times higher; one partnership playbook claims 8 to 15% when targeted with a concrete mutual benefit (vendor claims) |
| Messages that are long, or about the sender | Guides agree: short (about 50 to 125 words), lead with the recipient's benefit, small first ask, specific subject line |
| One email is not enough | A single follow-up reportedly lifts replies by about two thirds; typical sequences are 3 to 7 touches |
| Finding the right person | ProductHunt hides most maker names (we measured about 81% redacted); enrichment tools such as Clay and Apollo exist for this |
| Tracking who was contacted | Partner work lives in a CRM (HubSpot, Salesforce); tools like Crossbeam sync into them |
| Alert overload | Monitoring tools warn that too many notifications get ignored |

## 4. Industry standards: what comparable tools do
- **Signal-based prospecting:** a "new product launched" event triggers outreach (Origami, Landbase, Enginy and others).
- **Launch monitors** for ProductHunt: filter by topic or keyword, run on a schedule, post to Slack; some label products as **new, accelerating, steady or fading** from upvote changes between runs.
- **Score thresholds per category** before an alert is sent.
- **Daily digests** by email or Slack.
- **Enrichment** of contact details, and **CRM sync**.
- **Multi-touch sequences** with follow-up reminders.
- **Partner platforms** (Crossbeam) alert on overlaps and sync to CRM.

## 5. Where our app stands
| Standard | We have it? |
|---|---|
| Live launch data, ranked, on demand | Yes |
| Responsiveness signal | Yes (makerReplies) |
| Personalised, short drafts, human sends | Yes |
| Pipeline tracking (status) | Yes, with a board view |
| Daily refresh | Yes (cron) |
| Urgency from the 7-day window | Yes (launch-window meter) |
| **Momentum: what is new or rising since last time** | **No** (the brief's "gained traction later in the day") |
| **Way to reach a founder when the name is hidden** | **Partly** (link to the ProductHunt page only) |
| **Explain why something ranks where it does** | **No** |
| **Follow-up reminder** | **No** |
| Slack or email alert | No |
| CRM sync | CSV export only |

## 6. Recommended additions, in priority order
_Status 12 Oct 2026: items 1 and 2 are built and live. Items 3 to 6 are not built._
1. **New and rising since your last check.** Compare each run with the previous saved one: tag brand-new launches and show upvote change ("+52 since this morning"). Answers the brief's two stated misses directly.
2. **Reach-out links when the founder is hidden.** Prefilled LinkedIn and X search links built from the product name. No scraping and no invented names.
3. **"Why this rank?"** A small breakdown of the score on each card. Strengthens "reliable outputs".
4. **Follow-up due.** A badge when a "Contacted" product has had no update for 3 days, with a short second draft using a different angle.
5. **Optional:** a LinkedIn-length version and a subject line for each message; a Slack or email morning digest of the closing-soon list.
6. **Experiment:** test whether an OAuth user token reveals more maker names than the developer token does. Official docs do not say; third-party sources suggest a token is needed for maker data.

**Deliberately not recommended:** auto-sending (fails Nine Checks 06 and 09); scraping LinkedIn or emails (privacy and terms); paid enrichment tools (outside "free tools only"); decorative charts without real data.

## Sources
- Partner manager role: [Growsumo glossary](https://growsumo.com/glossary/partner-manager), [Built In Chicago posting](https://www.builtinchicago.org/job/partner-manager-0), [Strive guide](https://strive.sites.sourceflow.co.uk/blog/partnerships-manager/)
- Signal-based prospecting: [Origami launch signal](https://www.origamiagents.com/signals/launched-new-product), [Landbase](https://landbase.com/blog/launched-new-product-signal-list-building), [Enginy](https://www.enginy.ai/blog/signal-based-prospecting), [Abmatic](https://abmatic.ai/blog/signal-based-outreach)
- Launch follow-up: [Teract](https://teract.ai/resources/launch-product-hunt-2026), [Hunted partnership intel](https://hunted.space/dashboard/partnership-intel)
- Outreach benchmarks: [Overloop](https://overloop.com/blog/benchmarks), [Instantly](https://instantly.ai/blog/how-to-improve-your-cold-email-reply-rate), [Prospeo](https://prospeo.io/s/outreach-methods)
- Partnership pitches: [Fyxer](https://www.fyxer.com/blog/partnership-email-templates), [FirstSales](https://firstsales.io/blog/partnership-outreach-playbook/), [Instantly templates](https://www.instantly.ai/blog/partnership-email-templates)
- Partner tools: [Crossbeam Slack](https://www.crossbeam.com/partner-mcps/slack), [Crossbeam marketplace](https://marketplace.crossbeam.com/partners/slack)
- ProductHunt monitoring: [Airtop and n8n](https://developers.airtop.ai/automations/monitor-product-hunt-n8n), [Apify launch monitor](https://apify.com/harvestlab/producthunt-scraper), [NODUS PH Radar](https://aiindigo.com/tutorials/getting-started-with-nodus-ph-radar-automating-product-hunt-discovery)
- ProductHunt API tokens: [Official docs](https://www.producthunt.com/v2/docs), [Python SDK notes](https://pypi.org/project/producthunt-sdk/)
- Async standup tools (context): [SaaSHub](https://www.saashub.com/best-standups-software), [Gowindmill](https://www.gowindmill.com/resources/lists/top-5-slack-bots)
