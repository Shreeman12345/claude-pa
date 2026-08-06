import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendMessage } from "@/lib/telegram/api";
import { formatFireMessage, formatLeadTimeMessage } from "@/lib/schedule/formatMessage";
import { nextOccurrence } from "@/lib/schedule/nextOccurrence";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse(null, { status: 401 });
  }

  // Deadlines with a lead-time nudge can be "due" for firing purposes well
  // before their starts_at, so a plain starts_at <= now() filter would miss
  // them. The table is tiny (single user), so it's simplest and safest to
  // pull every active row and decide in code.
  const { data: activeItems, error } = await supabaseAdmin
    .from("schedule_items")
    .select("*")
    .eq("active", true);

  if (error || !activeItems) {
    console.error("Failed to fetch active schedule_items:", error);
    return NextResponse.json({ checked: 0, fired: 0 });
  }

  const now = new Date();
  let fired = 0;

  for (const item of activeItems) {
    const startsAt = new Date(item.starts_at);
    const hasLeadTime = item.kind === "deadline" && item.remind_before_days != null;

    if (hasLeadTime) {
      const leadStart = new Date(startsAt.getTime() - item.remind_before_days * DAY_MS);

      if (now >= leadStart && now < startsAt) {
        // Reuse last_fired_at as "already sent for this window": once set,
        // it falls inside [leadStart, startsAt) by construction, so it can't
        // be mistaken for the later due-date firing's own guard below.
        const alreadyNudged = item.last_fired_at && new Date(item.last_fired_at) >= leadStart;
        if (alreadyNudged) continue;

        const daysRemaining = Math.round((startsAt.getTime() - now.getTime()) / DAY_MS);
        await sendMessage(
          process.env.TELEGRAM_USER_ID!,
          formatLeadTimeMessage(item, daysRemaining)
        );
        await supabaseAdmin
          .from("schedule_items")
          .update({ last_fired_at: now.toISOString() })
          .eq("id", item.id);

        fired++;
        continue;
      }

      if (now < leadStart) continue; // not due and not yet in the lead window
      // else fall through to the normal due-time firing below
    }

    if (startsAt > now) continue;
    if (item.last_fired_at && new Date(item.last_fired_at) >= startsAt) continue;

    await sendMessage(process.env.TELEGRAM_USER_ID!, formatFireMessage(item));

    if (item.recurrence) {
      const next = nextOccurrence(startsAt, item.recurrence, item.recurrence_days);
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

  return NextResponse.json({ checked: activeItems.length, fired });
}
