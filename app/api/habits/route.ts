import { NextResponse } from "next/server";
import { getTodayHabitStatus } from "@/lib/habits/panel";
import { dayKey } from "@/lib/schedule/datetime";

export async function GET() {
  const logDate = dayKey(new Date());
  const habits = await getTodayHabitStatus(logDate);
  return NextResponse.json({ logDate, habits });
}
