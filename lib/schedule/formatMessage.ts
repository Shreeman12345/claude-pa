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
