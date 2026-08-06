import { Recurrence } from "@/lib/schedule/parse";
import { localParts, fromLocalParts, daysInMonth } from "@/lib/schedule/datetime";

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Advance a recurring item to its next occurrence, keeping the same local
 * clock time.
 *
 * All calendar reasoning goes through the user's local fields. Reading
 * getDay()/getDate() directly would use server-local time -- on Vercel that's
 * UTC, where a 1:00 AM Monday item is still Sunday, so "every Monday" would
 * advance from the wrong weekday.
 *
 * Asia/Kolkata has no DST, so adding whole days as milliseconds preserves the
 * local clock time exactly.
 */
export function nextOccurrence(
  current: Date,
  recurrence: Recurrence,
  recurrenceDays: string | null
): Date {
  if (recurrence === "daily") {
    return new Date(current.getTime() + DAY_MS);
  }

  if (recurrence === "weekly") {
    const targetDays = (recurrenceDays ?? "")
      .split(",")
      .map((d) => WEEKDAY_INDEX[d.trim().toLowerCase()])
      .filter((d): d is number => d !== undefined);

    if (targetDays.length > 0) {
      const { weekday } = localParts(current);
      for (let delta = 1; delta <= 7; delta++) {
        if (targetDays.includes((weekday + delta) % 7)) {
          return new Date(current.getTime() + delta * DAY_MS);
        }
      }
    }
    return new Date(current.getTime() + 7 * DAY_MS);
  }

  const parts = localParts(current);

  if (recurrence === "monthly") {
    const year = parts.year + (parts.month === 11 ? 1 : 0);
    const month = (parts.month + 1) % 12;
    // Clamp so 31 Jan rolls to 28/29 Feb rather than overflowing into March.
    return fromLocalParts({
      ...parts,
      year,
      month,
      day: Math.min(parts.day, daysInMonth(year, month)),
    });
  }

  // yearly -- clamp keeps 29 Feb valid in non-leap years.
  const year = parts.year + 1;
  return fromLocalParts({
    ...parts,
    year,
    day: Math.min(parts.day, daysInMonth(year, parts.month)),
  });
}
