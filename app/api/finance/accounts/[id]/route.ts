import { NextRequest, NextResponse } from "next/server";
import { updateAccountBalance, getPeriodSummary } from "@/lib/finance/panel";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  if (typeof body.balance !== "number") {
    return NextResponse.json({ error: "balance (number) is required" }, { status: 400 });
  }

  const updated = await updateAccountBalance(params.id, body.balance);
  if (!updated) {
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }

  const summary = await getPeriodSummary();
  return NextResponse.json({ account: updated, summary });
}
