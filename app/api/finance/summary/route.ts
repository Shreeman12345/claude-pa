import { NextResponse } from "next/server";
import { getPeriodSummary } from "@/lib/finance/panel";

export async function GET() {
  const summary = await getPeriodSummary();
  if (!summary) {
    return NextResponse.json({ error: "No active finance period" }, { status: 404 });
  }
  return NextResponse.json(summary);
}
