import { ScheduleKind } from "@/lib/schedule/parse";
import { dayLabel, timeLabel } from "@/lib/schedule/datetime";

const KIND_EMOJI: Record<ScheduleKind, string> = {
  class: "🎓",
  event: "📅",
  reminder: "⏰",
  deadline: "📌",
};

const KIND_LABEL: Record<ScheduleKind, string> = {
  class: "Class",
  event: "Event",
  reminder: "Reminder",
  deadline: "Deadline",
};

function formatDateTime(iso: string, includeTime: boolean): string {
  const date = new Date(iso);
  return includeTime ? `${dayLabel(date)}, ${timeLabel(date)}` : dayLabel(date);
}

export function formatScheduleConfirmation(item: {
  kind: ScheduleKind;
  title: string;
  location: string | null;
  starts_at: string;
}): string {
  const emoji = KIND_EMOJI[item.kind];
  const label = KIND_LABEL[item.kind];
  const locationPart = item.location ? ` at ${item.location}` : "";
  const dateStr = formatDateTime(item.starts_at, item.kind !== "deadline");
  return `${emoji} ${label} — ${item.title}${locationPart} · ${dateStr}`;
}

/** Early "heads up" nudge, distinct from the due-date firing itself. */
export function formatLeadTimeMessage(item: { title: string; starts_at: string }, daysRemaining: number): string {
  const days = Math.max(1, daysRemaining);
  const plural = days === 1 ? "day" : "days";
  const dueLabel = dayLabel(new Date(item.starts_at));
  return `📌 Heads up — ${item.title} due in ${days} ${plural} (${dueLabel}). Time to start prepping.`;
}

export function formatFireMessage(item: {
  kind: ScheduleKind;
  title: string;
  location: string | null;
  notes: string | null;
}): string {
  const emoji = KIND_EMOJI[item.kind];
  const locationPart = item.location ? ` at ${item.location}` : "";
  const notesPart = item.notes ? `\n${item.notes}` : "";
  return `${emoji} ${item.title}${locationPart}${notesPart}`;
}
