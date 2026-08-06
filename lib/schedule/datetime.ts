/**
 * The bot serves a single user in India. Every user-facing date/time has to be
 * rendered in their local zone -- the server runs in UTC, so formatting a raw
 * timestamp puts late-evening IST items on the previous day.
 */
export const TIMEZONE = "Asia/Kolkata";
export const UTC_OFFSET = "+05:30";
/** Same offset in minutes, for libraries that want a numeric reference. */
export const UTC_OFFSET_MINUTES = 330;

/** YYYY-MM-DD in the user's timezone. Sorts lexicographically. */
export function dayKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

/** "Thu 7 Aug" -- assembled from parts so order doesn't depend on locale. */
export function dayLabel(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}

/** "8:00 PM" in the user's timezone. */
export function timeLabel(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Midnight today in the user's timezone, as a UTC instant. */
export function startOfToday(): Date {
  return new Date(`${dayKey(new Date())}T00:00:00${UTC_OFFSET}`);
}

/** Midnight of a given day key in the user's timezone, as a UTC instant. */
export function startOfDay(key: string): Date {
  return new Date(`${key}T00:00:00${UTC_OFFSET}`);
}

/** "15 Aug" from a date-only column, kept in UTC so the day can't shift. */
export function formatDateOnly(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).formatToParts(new Date(Date.UTC(year, month - 1, day)));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("day")} ${part("month")}`;
}

/** Whole days from today (user's timezone) to a date-only string. */
export function daysUntil(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [ty, tm, td] = dayKey(new Date()).split("-").map(Number);
  const diffMs = Date.UTC(year, month - 1, day) - Date.UTC(ty, tm - 1, td);
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}
