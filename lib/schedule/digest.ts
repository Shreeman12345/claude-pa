import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ScheduleKind } from "@/lib/schedule/parse";
import {
  dayKey,
  dayLabel,
  timeLabel,
  startOfToday,
  startOfDay,
  formatDateOnly,
  daysUntil,
  localParts,
} from "@/lib/schedule/datetime";
import { HABITS } from "@/lib/habits/panel";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday..Sunday of the current week, in the user's timezone. */
function currentWeekRange(): { mondayKey: string; sundayKey: string } {
  const { weekday } = localParts(new Date());
  const daysSinceMonday = (weekday + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0, ... Sat=6 -> 5
  const monday = new Date(startOfToday().getTime() - daysSinceMonday * DAY_MS);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  return { mondayKey: dayKey(monday), sundayKey: dayKey(sunday) };
}

const KIND_EMOJI: Record<ScheduleKind, string> = {
  class: "🎓",
  event: "📅",
  reminder: "⏰",
  deadline: "📌",
};

/** Escape the characters Telegram's legacy Markdown parser treats as markup. */
function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[`])/g, "\\$1");
}

function formatScheduleLine(item: {
  kind: ScheduleKind;
  title: string;
  location: string | null;
  starts_at: string;
}): string {
  const emoji = KIND_EMOJI[item.kind];
  const title =
    item.kind === "deadline" && !/\bdue\s*$/i.test(item.title)
      ? `${item.title} due`
      : item.title;

  const parts = [`${emoji} `];
  // Deadlines are day-scoped; a clock time on them is noise.
  if (item.kind !== "deadline") {
    parts.push(`${timeLabel(new Date(item.starts_at))} — `);
  }
  parts.push(escapeMarkdown(title));
  if (item.location) {
    parts.push(` · ${escapeMarkdown(item.location)}`);
  }
  return parts.join("");
}

export async function buildWeeklyDigest(): Promise<string> {
  const windowStart = startOfToday();
  const scheduleWindowEnd = new Date(windowStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const examWindowEnd = new Date(windowStart.getTime() + 14 * 24 * 60 * 60 * 1000);
  const todayKey = dayKey(new Date());

  const { mondayKey, sundayKey } = currentWeekRange();

  const [scheduleRes, tasksRes, examsRes, habitsRes] = await Promise.all([
    supabaseAdmin
      .from("schedule_items")
      .select("kind, title, location, starts_at")
      .eq("active", true)
      .gte("starts_at", windowStart.toISOString())
      .lte("starts_at", scheduleWindowEnd.toISOString())
      .order("starts_at", { ascending: true }),
    supabaseAdmin
      .from("tasks")
      .select("title, urgency")
      .is("completed_at", null)
      .in("urgency", ["today", "week"])
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("exams")
      .select("subject, exam_date")
      .gte("exam_date", todayKey)
      .lte("exam_date", dayKey(examWindowEnd))
      .order("exam_date", { ascending: true }),
    supabaseAdmin
      .from("habit_logs")
      .select("done")
      .gte("log_date", mondayKey)
      .lte("log_date", sundayKey)
      .eq("done", true),
  ]);

  if (scheduleRes.error) console.error("Digest: schedule_items query failed:", scheduleRes.error);
  if (tasksRes.error) console.error("Digest: tasks query failed:", tasksRes.error);
  if (examsRes.error) console.error("Digest: exams query failed:", examsRes.error);
  if (habitsRes.error) console.error("Digest: habit_logs query failed:", habitsRes.error);

  const scheduleItems = scheduleRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const exams = examsRes.data ?? [];
  const habitsDone = habitsRes.data?.length ?? 0;
  const habitsPossible = HABITS.length * 7;
  const habitsLine = `🔥 Habits this week: ${habitsDone}/${habitsPossible}`;

  if (scheduleItems.length === 0 && tasks.length === 0 && exams.length === 0) {
    return `Nothing scheduled this week 🎉\n\n${habitsLine}`;
  }

  const sections: string[] = ["📅 *This week*"];

  const byDay = new Map<string, typeof scheduleItems>();
  for (const item of scheduleItems) {
    const key = dayKey(new Date(item.starts_at));
    const bucket = byDay.get(key);
    if (bucket) bucket.push(item);
    else byDay.set(key, [item]);
  }

  for (const [key, items] of Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    const date = startOfDay(key);
    const heading = key === todayKey ? `Today · ${dayLabel(date)}` : dayLabel(date);
    sections.push([`*${heading}*`, ...items.map(formatScheduleLine)].join("\n"));
  }

  if (tasks.length > 0) {
    sections.push(
      ["*No date*", ...tasks.map((t) => `📋 ${escapeMarkdown(t.title)}`)].join("\n")
    );
  }

  if (exams.length > 0) {
    const lines = exams.map((exam) => {
      const days = daysUntil(exam.exam_date);
      const when = days === 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
      return `${escapeMarkdown(exam.subject)} — ${formatDateOnly(exam.exam_date)} (${when})`;
    });
    sections.push(["🎓 *Exams coming up*", ...lines].join("\n"));
  }

  sections.push(habitsLine);

  return sections.join("\n\n");
}
