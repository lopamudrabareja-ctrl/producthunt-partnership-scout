// The outreach pipeline stages. A tiny file with no imports, safe to use in both the server and the browser.
export const STATUSES = ["new", "contacted", "replied", "skip"] as const;
export type Status = (typeof STATUSES)[number];
