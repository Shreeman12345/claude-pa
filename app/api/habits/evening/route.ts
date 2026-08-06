import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram/api";
import { buildHabitPanel } from "@/lib/habits/panel";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse(null, { status: 401 });
  }

  const panel = await buildHabitPanel();
  await sendMessage(process.env.TELEGRAM_USER_ID!, panel.text, panel.keyboard, "Markdown");

  return NextResponse.json({ sent: true });
}
