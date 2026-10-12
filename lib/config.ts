// All the knobs in one place, so the answer to "where do I change X?" is always "here".

// Kavya's four adjacent categories -> the ProductHunt topic slugs we verified in C2.
// (Wrong slugs silently return 0 posts, so only use slugs listed in CLAUDE.md section 7b.)
export const CATEGORIES = {
  "project-management": { label: "Project management", topics: ["task-management"] },
  "hr-tech": { label: "HR tech", topics: ["human-resources", "hiring"] },
  "developer-productivity": { label: "Developer productivity", topics: ["developer-tools"] },
  "team-communication": { label: "Team communication", topics: ["messaging", "meetings", "remote-work"] },
} as const;

export type CategoryId = keyof typeof CATEGORIES;
export const ALL_CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

export const WINDOW_DAYS = 7; // Kavya must reach founders within 7 days of launch
export const POSTS_PER_TOPIC = 15; // fetch the top 15 by votes per topic (6,000+ launches a week overall)
export const MAX_RESULTS = 20; // size of the ranked list returned

// Scoring: 60% votes + 40% maker replies (decided with the student), plus a small freshness bonus.
export const WEIGHTS = { votes: 0.6, makerReplies: 0.4, freshness: 0.05 } as const;

// Day 5 or later = the 7-day window is closing, so flag it as urgent.
export const URGENT_FROM_DAY = 5;

export const AI_TOP_N = 10; // only the top 10 get Gemini drafts (cheaper, faster, fewer rate-limit problems)
