import * as chrono from "chrono-node";
import { SUBJECTS } from "@/lib/router/classifyDocument";
import { classifyScheduleFallback } from "@/lib/schedule/classifyScheduleFallback";
import { UTC_OFFSET_MINUTES } from "@/lib/schedule/datetime";

export type ScheduleKind = "class" | "event" | "reminder" | "deadline";
export type Recurrence = "daily" | "weekly" | "monthly" | "yearly";
export type TimeSpecificity = "specific" | "vague";

export interface ParsedScheduleItem {
  kind: ScheduleKind;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  recurrence: Recurrence | null;
  recurrence_days: string | null;
  subject: string | null;
  time_specificity: TimeSpecificity;
}

const DAY_NAMES: Record<string, string> = {
  monday: "mon",
  mon: "mon",
  tuesday: "tue",
  tue: "tue",
  wednesday: "wed",
  wed: "wed",
  thursday: "thu",
  thu: "thu",
  friday: "fri",
  fri: "fri",
  saturday: "sat",
  sat: "sat",
  sunday: "sun",
  sun: "sun",
};

export function hasExplicitReminderPhrasing(text: string): boolean {
  return /\bremind(er)?\b/i.test(text);
}

function inferKind(text: string): ScheduleKind {
  const lower = text.toLowerCase();
  if (hasExplicitReminderPhrasing(text)) return "reminder";
  if (/\bdue\b|\bdeadline\b/.test(lower)) return "deadline";
  if (/\bclass\b|\blecture\b|\blab\b/.test(lower)) return "class";
  if (/\bat\b|\bwith\b|\bmeeting\b|\bhangout\b|\bdinner\b|\blunch\b|\bcall\b|\bparty\b/.test(lower)) {
    return "event";
  }
  return "reminder";
}

function inferRecurrence(text: string): { recurrence: Recurrence | null; recurrence_days: string | null } {
  const lower = text.toLowerCase();

  const dayMatches = Object.keys(DAY_NAMES).filter((day) =>
    new RegExp(`\\b${day}s?\\b`).test(lower)
  );

  if (/\bevery day\b|\bdaily\b/.test(lower)) {
    return { recurrence: "daily", recurrence_days: null };
  }
  if (/\bevery year\b|\bannually\b|\byearly\b/.test(lower)) {
    return { recurrence: "yearly", recurrence_days: null };
  }
  if (/\bevery month\b|\bmonthly\b/.test(lower)) {
    return { recurrence: "monthly", recurrence_days: null };
  }
  if (/\bevery\b/.test(lower) && dayMatches.length > 0) {
    const days = Array.from(new Set(dayMatches.map((d) => DAY_NAMES[d]))).join(",");
    return { recurrence: "weekly", recurrence_days: days };
  }
  if (/\bevery week\b|\bweekly\b/.test(lower)) {
    return { recurrence: "weekly", recurrence_days: null };
  }

  return { recurrence: null, recurrence_days: null };
}

function inferLocation(
  withoutDate: string
): { location: string | null; matchedPhrase: string | null } {
  const match = withoutDate.match(/\bat\s+([A-Z][A-Za-z0-9 ,'-]{2,40})/);
  if (!match) return { location: null, matchedPhrase: null };
  return { location: match[1].trim(), matchedPhrase: match[0] };
}

function inferSubject(text: string): string | null {
  const found = SUBJECTS.find((s) => text.toLowerCase().includes(s.toLowerCase()));
  return found ?? null;
}

function inferTitle(strippedText: string, kind: ScheduleKind): string {
  let title = strippedText.trim();
  title = title.replace(/^(remind me to|reminder to|remind me|due|deadline for|deadline)\b[:\-]?\s*/i, "");
  title = title.replace(/\s{2,}/g, " ").trim().replace(/^[,.\-–]+|[,.\-–]+$/g, "").trim();

  if (title.length > 0) return title;

  const fallbackTitles: Record<ScheduleKind, string> = {
    class: "Class",
    event: "Event",
    reminder: "Reminder",
    deadline: "Deadline",
  };
  return fallbackTitles[kind];
}

function chronoTimeSpecificity(matchedText: string): TimeSpecificity {
  const lower = matchedText.toLowerCase();
  const hasClockTime = /\b\d{1,2}(:\d{2})?\s*(am|pm)\b|\b\d{1,2}:\d{2}\b/.test(lower);
  const hasWeekday = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/.test(
    lower
  );
  const hasNamedRelativeDay = /\b(today|tomorrow|tonight)\b/.test(lower);
  const hasExplicitDateNumber =
    /\b\d{1,2}(st|nd|rd|th)\b/.test(lower) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b/.test(lower) ||
    /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/.test(lower);

  return hasClockTime || hasWeekday || hasNamedRelativeDay || hasExplicitDateNumber
    ? "specific"
    : "vague";
}

export async function parseScheduleMessage(text: string): Promise<ParsedScheduleItem | null> {
  const now = new Date();
  // Without an explicit timezone reference chrono resolves clock times against
  // the server clock, which is UTC on Vercel -- "1am" would be stored as 1am
  // UTC, i.e. 6:30am for the user.
  const results = chrono.parse(
    text,
    { instant: now, timezone: UTC_OFFSET_MINUTES },
    { forwardDate: true }
  );

  if (results.length > 0) {
    const result = results[0];
    const startsAt = result.start.date();
    const endsAt = result.end ? result.end.date() : null;
    const kind = inferKind(text);
    const { recurrence, recurrence_days } = inferRecurrence(text);

    const withoutDate = text.replace(result.text, "");
    const { location, matchedPhrase } =
      kind === "event" ? inferLocation(withoutDate) : { location: null, matchedPhrase: null };
    const strippedForTitle = matchedPhrase ? withoutDate.replace(matchedPhrase, "") : withoutDate;

    return {
      kind,
      title: inferTitle(strippedForTitle, kind),
      location,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt ? endsAt.toISOString() : null,
      recurrence,
      recurrence_days,
      subject: inferSubject(text),
      time_specificity: chronoTimeSpecificity(result.text),
    };
  }

  const fallback = await classifyScheduleFallback(text);
  if (
    !fallback.is_schedule_item ||
    !fallback.kind ||
    !fallback.starts_at ||
    fallback.time_specificity === "none"
  ) {
    return null;
  }

  return {
    kind: fallback.kind,
    title: fallback.title ?? inferTitle(text, fallback.kind),
    location: fallback.location,
    starts_at: fallback.starts_at,
    ends_at: fallback.ends_at,
    recurrence: fallback.recurrence,
    recurrence_days: fallback.recurrence_days,
    subject: fallback.subject,
    time_specificity: fallback.time_specificity,
  };
}
