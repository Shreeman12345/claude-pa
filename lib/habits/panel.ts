import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { dayKey, dayLabel } from "@/lib/schedule/datetime";

export const HABITS = ["Gym", "Diet", "HairSkin", "MealPrep", "Journaling"] as const;
export type Habit = (typeof HABITS)[number];

const HABIT_LABEL: Record<Habit, string> = {
  Gym: "Gym",
  Diet: "Diet",
  HairSkin: "Hair/Skin",
  MealPrep: "Meal Prep",
  Journaling: "Journaling",
};

interface InlineKeyboard {
  inline_keyboard: { text: string; callback_data: string }[][];
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size) as T[]);
  }
  return out;
}

export interface HabitPanel {
  text: string;
  keyboard: InlineKeyboard;
}

export async function buildHabitPanel(logDate: string = dayKey(new Date())): Promise<HabitPanel> {
  const { data, error } = await supabaseAdmin
    .from("habit_logs")
    .select("habit, done")
    .eq("log_date", logDate);

  if (error) {
    console.error("Failed to load habit_logs for panel:", error);
  }

  const doneMap = new Map((data ?? []).map((row) => [row.habit as Habit, row.done]));
  const doneCount = HABITS.filter((h) => doneMap.get(h)).length;

  const label = dayLabel(new Date(`${logDate}T00:00:00+05:30`));
  const text = `🔥 *Habits · ${label}*  (${doneCount}/${HABITS.length})`;

  const buttons = HABITS.map((habit) => ({
    text: `${doneMap.get(habit) ? "✅" : "⬜"} ${HABIT_LABEL[habit]}`,
    callback_data: `habit:${habit}:${logDate}`,
  }));

  return { text, keyboard: { inline_keyboard: chunk(buttons, 2) } };
}

export async function toggleHabit(habit: Habit, logDate: string): Promise<void> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("habit_logs")
    .select("id, done")
    .eq("log_date", logDate)
    .eq("habit", habit)
    .maybeSingle();

  if (selectError) {
    console.error("Failed to read habit_logs row:", selectError);
    return;
  }

  if (existing) {
    const { error } = await supabaseAdmin
      .from("habit_logs")
      .update({ done: !existing.done, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) console.error("Failed to toggle habit_logs row:", error);
    return;
  }

  const { error } = await supabaseAdmin
    .from("habit_logs")
    .insert({ log_date: logDate, habit, done: true });
  if (error) console.error("Failed to insert habit_logs row:", error);
}
