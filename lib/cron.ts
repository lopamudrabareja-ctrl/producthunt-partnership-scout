// Protects /api/cron. Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically when the
// CRON_SECRET environment variable is set. Without this check, anyone who guessed the URL could trigger runs
// and burn the Gemini quota. If the secret is not configured, NOBODY is authorised (safe by default).
import { timingSafeEqual } from "node:crypto";

export function isAuthorizedCron(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret || !authHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(authHeader);
  // timingSafeEqual needs equal lengths; comparing in constant time stops attackers learning the secret by timing.
  return got.length === expected.length && timingSafeEqual(got, expected);
}
