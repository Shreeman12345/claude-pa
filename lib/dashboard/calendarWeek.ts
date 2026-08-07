import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TIMEZONE, dayKey, localParts, timeLabel } from "@/lib/schedule/datetime";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CalendarDay {
  day: string;
  date: string;
  dateKey: string;
  active: boolean;
}

export interface CalendarBlock {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  tag: string;
}

export interface CalendarWeek {
  monthLabel: string;
  days: CalendarDay[];
  blocks: CalendarBlock[];
  /** True if schedule_items failed to load — blocks is empty but not necessarily accurate. */
  loadError: boolean;
}

/** Midnight Monday of the week containing `now`, in the user's timezone, as a UTC instant. */
function startOfWeek(now: Date): Date {
  const { weekday } = localParts(now);
  const mondayOffset = (weekday + 6) % 7; // weekday is 0=Sun; days since Monday
  const todayMidnight = new Date(`${dayKey(now)}T00:00:00+05:30`);
  return new Date(todayMidnight.getTime() - mondayOffset * DAY_MS);
}

export async function getCalendarWeek(): Promise<CalendarWeek> {
  const now = new Date();
  const monday = startOfWeek(now);
  const nextMonday = new Date(monday.getTime() + 7 * DAY_MS);
  const todayKey = dayKey(now);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * DAY_MS);
    const key = dayKey(d);
    days.push({
      day: new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, weekday: "short" }).format(d).toUpperCase(),
      date: String(localParts(d).day).padStart(2, "0"),
      dateKey: key,
      active: key === todayKey,
    });
  }

  const { data, error } = await supabaseAdmin
    .from("schedule_items")
    .select("id, kind, title, location, notes, starts_at, ends_at")
    .eq("active", true)
    .gte("starts_at", monday.toISOString())
    .lt("starts_at", nextMonday.toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Failed to load schedule_items for calendar week:", error);
  }

  const blocks: CalendarBlock[] = (data ?? []).map((item) => ({
    id: item.id,
    time: item.ends_at
      ? `${timeLabel(new Date(item.starts_at))} — ${timeLabel(new Date(item.ends_at))}`
      : timeLabel(new Date(item.starts_at)),
    title: item.title,
    subtitle: item.location ?? item.notes ?? "",
    tag: item.kind.toUpperCase(),
  }));

  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    month: "long",
    year: "numeric",
  })
    .format(now)
    .toUpperCase();

  return { monthLabel, days, blocks, loadError: Boolean(error) };
}
