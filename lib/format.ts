// "3 min ago" style text for the cache banner.
export function timeAgo(iso: string, now: Date): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "unknown time";
  const sec = Math.max(0, Math.floor((now.getTime() - t) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr} hr ago`;
  return `${Math.floor(hr / 24)} days ago`;
}

// The 7-day outreach window: how many days are left after `daysSinceLaunch` days.
import { WINDOW_DAYS } from "./config";

export function daysLeft(daysSinceLaunch: number): number {
  return Math.max(0, WINDOW_DAYS - Math.max(0, daysSinceLaunch));
}

export function windowLabel(daysSinceLaunch: number): string {
  const left = daysLeft(daysSinceLaunch);
  if (left === 0) return "Window closes today";
  return left === 1 ? "1 day left" : `${left} days left`;
}

// How many of the 7 meter segments are filled = full days elapsed, so filled + days left always equals 7.
export function filledSegments(daysSinceLaunch: number): number {
  return Math.min(WINDOW_DAYS, Math.max(0, daysSinceLaunch));
}
