import { NextRequest, NextResponse } from "next/server";
import { getActiveTasks } from "@/lib/tasks/panel";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  const tasks = await getActiveTasks(limit);
  return NextResponse.json({ tasks });
}
