import { NextRequest, NextResponse } from "next/server";
import { updateCategoryExpected, getPeriodSummary } from "@/lib/finance/panel";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  if (typeof body.expected !== "number") {
    return NextResponse.json({ error: "expected (number) is required" }, { status: 400 });
  }

  const updated = await updateCategoryExpected(params.id, body.expected);
  if (!updated) {
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }

  const summary = await getPeriodSummary();
  return NextResponse.json({ category: updated, summary });
}
