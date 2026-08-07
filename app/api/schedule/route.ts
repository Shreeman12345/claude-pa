import { NextRequest, NextResponse } from "next/server";
import { getScheduleItems, getCurrentWeekItems, createScheduleItem, NewScheduleItem } from "@/lib/schedule/panel";
import { startOfDay } from "@/lib/schedule/datetime";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const items =
    start && end
      ? await getScheduleItems(startOfDay(start), startOfDay(end))
      : await getCurrentWeekItems();

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body: Partial<NewScheduleItem> = await req.json();

  if (!body.kind || !body.title || !body.starts_at) {
    return NextResponse.json({ error: "kind, title, and starts_at are required" }, { status: 400 });
  }

  const created = await createScheduleItem(body as NewScheduleItem);
  if (!created) {
    return NextResponse.json({ error: "Failed to create schedule item" }, { status: 500 });
  }

  const items = await getCurrentWeekItems();
  return NextResponse.json({ items }, { status: 201 });
}
