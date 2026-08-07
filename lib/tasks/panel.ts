import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type Urgency = "today" | "week" | "month" | "someday";

export interface Task {
  id: string;
  title: string;
  urgency: Urgency;
  createdAt: string;
}

const URGENCY_ORDER: Record<Urgency, number> = {
  today: 0,
  week: 1,
  month: 2,
  someday: 3,
};

export async function getActiveTasks(limit = 5): Promise<Task[]> {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("id, title, urgency, created_at")
    .is("completed_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load tasks:", error);
    return [];
  }

  const tasks: Task[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    urgency: row.urgency as Urgency,
    createdAt: row.created_at,
  }));

  tasks.sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);
  return tasks.slice(0, limit);
}

/** Flips completed_at between null and now(), mirroring toggleHabit's shape. */
export async function toggleTaskComplete(taskId: string): Promise<void> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("tasks")
    .select("id, completed_at")
    .eq("id", taskId)
    .maybeSingle();

  if (selectError || !existing) {
    console.error("Failed to read task row:", selectError);
    return;
  }

  const { error } = await supabaseAdmin
    .from("tasks")
    .update({
      completed_at: existing.completed_at ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) console.error("Failed to toggle task:", error);
}
