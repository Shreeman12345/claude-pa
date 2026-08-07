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

/** "15:38" -- 24hr HH:MM in the user's timezone. */
export function hhmm(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
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

export interface LocalParts {
  year: number;
  /** 0-based, matching Date's month convention. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday. */
  weekday: number;
}

/**
 * Calendar fields as the user sees them. Date's getFullYear/getMonth/getDate/
 * getDay all read server-local time, which is UTC on Vercel -- use these
 * instead for any calendar arithmetic.
 *
 * Asia/Kolkata has no DST, so shifting by a fixed offset is exact.
 */
export function localParts(date: Date): LocalParts {
  const shifted = new Date(date.getTime() + UTC_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    weekday: shifted.getUTCDay(),
  };
}

/** Inverse of localParts: local calendar fields back to a UTC instant. */
export function fromLocalParts(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}): Date {
  return new Date(
    Date.UTC(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second) -
      UTC_OFFSET_MINUTES * 60_000
  );
}

/** Days in a month, by 0-based month index. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Whole days from today (user's timezone) to a date-only string. */
export function daysUntil(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [ty, tm, td] = dayKey(new Date()).split("-").map(Number);
  const diffMs = Date.UTC(year, month - 1, day) - Date.UTC(ty, tm - 1, td);
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface WeekBounds {
  /** Midnight Monday, as a UTC instant. */
  monday: Date;
  /** Midnight the following Monday, as a UTC instant -- an exclusive upper bound. */
  nextMonday: Date;
  mondayKey: string;
  sundayKey: string;
}

/** Monday..Sunday of the week containing `now`, in the user's timezone. */
export function weekBounds(now: Date = new Date()): WeekBounds {
  const { weekday } = localParts(now);
  const mondayOffset = (weekday + 6) % 7; // weekday is 0=Sun; days since Monday
  const monday = new Date(startOfDay(dayKey(now)).getTime() - mondayOffset * DAY_MS);
  const nextMonday = new Date(monday.getTime() + 7 * DAY_MS);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  return { monday, nextMonday, mondayKey: dayKey(monday), sundayKey: dayKey(sunday) };
}
