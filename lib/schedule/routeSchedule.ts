import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendMessage } from "@/lib/telegram/api";
import {
  parseScheduleMessage,
  hasExplicitReminderPhrasing,
  ParsedScheduleItem,
} from "@/lib/schedule/parse";
import { formatScheduleConfirmation } from "@/lib/schedule/formatMessage";

async function insertScheduleItem(item: ParsedScheduleItem): Promise<void> {
  await supabaseAdmin.from("schedule_items").insert({
    kind: item.kind,
    title: item.title,
    location: item.location,
    notes: null,
    starts_at: item.starts_at,
    ends_at: item.ends_at,
    recurrence: item.recurrence,
    recurrence_days: item.recurrence_days,
    subject: item.subject,
    active: true,
    remind_before_days: item.remind_before_days,
  });
}

/** Returns true if the message was fully handled (schedule-related). */
export async function handleScheduleMessage(message: any): Promise<boolean> {
  const text: string = message.text;
  const parsed = await parseScheduleMessage(text);
  if (!parsed) return false;

  const explicitReminder = hasExplicitReminderPhrasing(text);

  // explicitReminder only decides whether to bypass the ambiguity buttons
  // below -- it must not override a kind parse() already inferred (e.g.
  // "due Friday, remind me a week before" is correctly kind: 'deadline';
  // forcing it to 'reminder' here would have discarded that).
  if (parsed.time_specificity === "specific" || explicitReminder) {
    await insertScheduleItem(parsed);
    await sendMessage(message.chat.id, formatScheduleConfirmation(parsed));
    return true;
  }

  const { data: pending, error } = await supabaseAdmin
    .from("pending_schedule")
    .insert({
      chat_id: String(message.chat.id),
      message_id: null,
      raw_text: text,
      parsed,
    })
    .select()
    .single();

  if (error || !pending) {
    console.error("Failed to create pending_schedule row:", error);
    return false;
  }

  const sent = await sendMessage(message.chat.id, `Not sure — "${text}"`, {
    inline_keyboard: [
      [
        { text: "📌 Task", callback_data: `schedpick:${pending.id}:task` },
        { text: "⏰ Reminder", callback_data: `schedpick:${pending.id}:reminder` },
      ],
    ],
  });

  if (sent) {
    await supabaseAdmin
      .from("pending_schedule")
      .update({ message_id: String(sent.message_id) })
      .eq("id", pending.id);
  }

  return true;
}
