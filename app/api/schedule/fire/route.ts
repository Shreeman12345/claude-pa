import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendMessage } from "@/lib/telegram/api";
import { formatFireMessage } from "@/lib/schedule/formatMessage";
import { nextOccurrence } from "@/lib/schedule/nextOccurrence";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse(null, { status: 401 });
  }

  const nowISO = new Date().toISOString();

  const { data: dueItems, error } = await supabaseAdmin
    .from("schedule_items")
    .select("*")
    .eq("active", true)
    .lte("starts_at", nowISO);

  if (error || !dueItems) {
    console.error("Failed to fetch due schedule_items:", error);
    return NextResponse.json({ fired: 0 });
  }

  let fired = 0;

  for (const item of dueItems) {
    if (item.last_fired_at && new Date(item.last_fired_at) >= new Date(item.starts_at)) {
      continue;
    }

    await sendMessage(process.env.TELEGRAM_USER_ID!, formatFireMessage(item));

    const now = new Date();

    if (item.recurrence) {
      const next = nextOccurrence(new Date(item.starts_at), item.recurrence, item.recurrence_days);
      await supabaseAdmin
        .from("schedule_items")
        .update({ starts_at: next.toISOString(), last_fired_at: now.toISOString() })
        .eq("id", item.id);
    } else {
      await supabaseAdmin
        .from("schedule_items")
        .update({ active: false, last_fired_at: now.toISOString() })
        .eq("id", item.id);
    }

    fired++;
  }

  return NextResponse.json({ checked: dueItems.length, fired });
}
