import { NextResponse } from "next/server";
import { getActiveTasks } from "@/lib/tasks/panel";

export async function GET() {
  const tasks = await getActiveTasks();
  return NextResponse.json({ tasks });
}
