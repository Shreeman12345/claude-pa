import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ScheduleKind, Recurrence } from "@/lib/schedule/parse";
import { weekBounds } from "@/lib/schedule/datetime";

export interface ScheduleItem {
  id: string;
  kind: ScheduleKind;
  title: string;
  location: string | null;
  notes: string | null;
  starts_at: string;
  ends_at: string | null;
  recurrence: Recurrence | null;
  recurrence_days: string | null;
  subject: string | null;
  remind_before_days: number | null;
}

const SELECT_COLUMNS =
  "id, kind, title, location, notes, starts_at, ends_at, recurrence, recurrence_days, subject, remind_before_days";

export interface NewScheduleItem {
  kind: ScheduleKind;
  title: string;
  location?: string | null;
  notes?: string | null;
  starts_at: string;
  ends_at?: string | null;
  recurrence?: Recurrence | null;
  recurrence_days?: string | null;
  subject?: string | null;
  remind_before_days?: number | null;
}

export async function getScheduleItems(start: Date, end: Date): Promise<ScheduleItem[]> {
  const { data, error } = await supabaseAdmin
    .from("schedule_items")
    .select(SELECT_COLUMNS)
    .eq("active", true)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Failed to load schedule_items:", error);
    return [];
  }
  return data ?? [];
}

/** Convenience wrapper for the dashboard's default view. */
export async function getCurrentWeekItems(): Promise<ScheduleItem[]> {
  const { monday, nextMonday } = weekBounds();
  return getScheduleItems(monday, nextMonday);
}

export async function createScheduleItem(item: NewScheduleItem): Promise<ScheduleItem | null> {
  const { data, error } = await supabaseAdmin
    .from("schedule_items")
    .insert({
      kind: item.kind,
      title: item.title,
      location: item.location ?? null,
      notes: item.notes ?? null,
      starts_at: item.starts_at,
      ends_at: item.ends_at ?? null,
      recurrence: item.recurrence ?? null,
      recurrence_days: item.recurrence_days ?? null,
      subject: item.subject ?? null,
      active: true,
      remind_before_days: item.remind_before_days ?? null,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to create schedule_item:", error);
    return null;
  }
  return data;
}

export async function updateScheduleItem(
  id: string,
  patch: Partial<NewScheduleItem>
): Promise<ScheduleItem | null> {
  const { data, error } = await supabaseAdmin
    .from("schedule_items")
    .update(patch)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to update schedule_item:", error);
    return null;
  }
  return data;
}

export async function deleteScheduleItem(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from("schedule_items").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete schedule_item:", error);
    return false;
  }
  return true;
}
