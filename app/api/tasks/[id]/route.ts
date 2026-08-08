import { NextRequest, NextResponse } from "next/server";
import { getActiveTasks, toggleTaskComplete } from "@/lib/tasks/panel";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  await toggleTaskComplete(params.id);
  const tasks = await getActiveTasks(limit);
  return NextResponse.json({ tasks });
}
