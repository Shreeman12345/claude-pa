import { NextRequest, NextResponse } from "next/server";
import { getCurrentWeekItems, updateScheduleItem, deleteScheduleItem, NewScheduleItem } from "@/lib/schedule/panel";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const patch: Partial<NewScheduleItem> = await req.json();

  const updated = await updateScheduleItem(params.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Failed to update schedule item" }, { status: 500 });
  }

  const items = await getCurrentWeekItems();
  return NextResponse.json({ items });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ok = await deleteScheduleItem(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Failed to delete schedule item" }, { status: 500 });
  }

  const items = await getCurrentWeekItems();
  return NextResponse.json({ items });
}
