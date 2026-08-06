import { Recurrence } from "@/lib/schedule/parse";

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function nextOccurrence(
  current: Date,
  recurrence: Recurrence,
  recurrenceDays: string | null
): Date {
  if (recurrence === "daily") {
    return new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }

  if (recurrence === "weekly") {
    if (recurrenceDays) {
      const targetDays = recurrenceDays
        .split(",")
        .map((d) => WEEKDAY_INDEX[d.trim().toLowerCase()])
        .filter((d) => d !== undefined);

      if (targetDays.length > 0) {
        for (let delta = 1; delta <= 7; delta++) {
          const candidateDay = (current.getDay() + delta) % 7;
          if (targetDays.includes(candidateDay)) {
            return new Date(current.getTime() + delta * 24 * 60 * 60 * 1000);
          }
        }
      }
    }
    return new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  if (recurrence === "monthly") {
    const targetYear = current.getFullYear() + (current.getMonth() === 11 ? 1 : 0);
    const targetMonth = (current.getMonth() + 1) % 12;
    const day = Math.min(current.getDate(), daysInMonth(targetYear, targetMonth));
    const next = new Date(current);
    next.setFullYear(targetYear, targetMonth, day);
    return next;
  }

  // yearly
  const targetYear = current.getFullYear() + 1;
  const month = current.getMonth();
  const day = Math.min(current.getDate(), daysInMonth(targetYear, month));
  const next = new Date(current);
  next.setFullYear(targetYear, month, day);
  return next;
}
