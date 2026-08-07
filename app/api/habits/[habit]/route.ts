import { NextRequest, NextResponse } from "next/server";
import { HABITS, Habit, toggleHabit, getTodayHabitStatus } from "@/lib/habits/panel";
import { dayKey } from "@/lib/schedule/datetime";

export async function POST(req: NextRequest, { params }: { params: { habit: string } }) {
  if (!(HABITS as readonly string[]).includes(params.habit)) {
    return NextResponse.json({ error: "Unknown habit" }, { status: 400 });
  }

  const habit = params.habit as Habit;
  const logDate = dayKey(new Date());

  await toggleHabit(habit, logDate);
  const habits = await getTodayHabitStatus(logDate);

  return NextResponse.json({ logDate, habits });
}
