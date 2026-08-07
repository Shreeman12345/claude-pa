import { NextRequest, NextResponse } from "next/server";
import { getActiveTasks, toggleTaskComplete } from "@/lib/tasks/panel";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await toggleTaskComplete(params.id);
  const tasks = await getActiveTasks();
  return NextResponse.json({ tasks });
}
