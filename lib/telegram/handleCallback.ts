import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { editMessageText, answerCallbackQuery } from "@/lib/telegram/api";
import {
  routeCapture,
  defaultFieldsFromRawText,
  CaptureKind,
} from "@/lib/router/routeCapture";
import { fileDocument } from "@/lib/router/routeDocument";
import { subjectKeyboard, docTypeKeyboard } from "@/lib/telegram/documentKeyboards";
import { formatScheduleConfirmation } from "@/lib/schedule/formatMessage";
import { ParsedScheduleItem } from "@/lib/schedule/parse";
import { createScheduleItem } from "@/lib/schedule/panel";
import { toggleHabit, buildHabitPanel, Habit } from "@/lib/habits/panel";

const KIND_LABELS: Record<CaptureKind, string> = {
  task: "Task",
  journal: "Journal",
  expense: "Expense",
  decision: "Decision",
};

export async function handleCallbackQuery(callbackQuery: any): Promise<void> {
  await answerCallbackQuery(callbackQuery.id);

  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;
  const data: string = callbackQuery.data ?? "";
  if (!chatId || !messageId) return;

  const [action, captureId, kind] = data.split(":");

  if (action === "yes") {
    const { data: capture } = await supabaseAdmin
      .from("raw_captures")
      .select("*")
      .eq("id", captureId)
      .single();

    const fields = capture?.classification?.fields;
    if (!capture || !fields) return;

    const guessedKind = kind as CaptureKind;
    await routeCapture(captureId, guessedKind, fields);
    await editMessageText(chatId, messageId, `Filed as ${KIND_LABELS[guessedKind]} ✅`);
    return;
  }

  if (action === "no") {
    await editMessageText(chatId, messageId, "Pick the right category:", {
      inline_keyboard: [
        [
          { text: "Task", callback_data: `pick:${captureId}:task` },
          { text: "Journal", callback_data: `pick:${captureId}:journal` },
        ],
        [
          { text: "Expense", callback_data: `pick:${captureId}:expense` },
          { text: "Decision", callback_data: `pick:${captureId}:decision` },
        ],
      ],
    });
    return;
  }

  if (action === "pick") {
    const pickedKind = kind as CaptureKind;
    const { data: capture } = await supabaseAdmin
      .from("raw_captures")
      .select("*")
      .eq("id", captureId)
      .single();
    if (!capture) return;

    const fields = defaultFieldsFromRawText(pickedKind, capture.raw_text ?? "");
    await routeCapture(captureId, pickedKind, fields);
    await editMessageText(
      chatId,
      messageId,
      `Filed as ${KIND_LABELS[pickedKind]} ✅`
    );
    return;
  }

  if (action === "docsubj" || action === "doctype") {
    const pendingId = captureId;
    const value = kind;

    const { data: pending } = await supabaseAdmin
      .from("pending_documents")
      .select("*")
      .eq("id", pendingId)
      .single();
    if (!pending) return;

    const field = action === "docsubj" ? "subject" : "doc_type";
    await supabaseAdmin
      .from("pending_documents")
      .update({ [field]: value })
      .eq("id", pendingId);

    const subject = action === "docsubj" ? value : pending.subject;
    const docType = action === "doctype" ? value : pending.doc_type;

    if (subject && docType) {
      const success = await fileDocument({
        fileId: pending.file_id,
        fileName: pending.file_name,
        subject,
        docType,
        captionText: pending.caption_text,
      });

      if (success) {
        await supabaseAdmin.from("pending_documents").delete().eq("id", pendingId);
        await editMessageText(chatId, messageId, `Filed as ${subject}/${docType} ✅`);
      } else {
        await editMessageText(
          chatId,
          messageId,
          "Something went wrong filing this — try tapping an option again.",
          action === "docsubj" ? subjectKeyboard(pendingId) : docTypeKeyboard(pendingId)
        );
      }
      return;
    }

    if (!subject) {
      await editMessageText(
        chatId,
        messageId,
        `Doc type: ${docType}. Which subject is this for?`,
        subjectKeyboard(pendingId)
      );
    } else {
      await editMessageText(
        chatId,
        messageId,
        `Subject: ${subject}. What type of document is this?`,
        docTypeKeyboard(pendingId)
      );
    }
    return;
  }

  if (action === "schedpick") {
    const pendingId = captureId;
    const choice = kind;

    const { data: pending } = await supabaseAdmin
      .from("pending_schedule")
      .select("*")
      .eq("id", pendingId)
      .single();
    if (!pending) return;

    if (choice === "task") {
      await supabaseAdmin
        .from("tasks")
        .insert({ title: pending.raw_text, urgency: "week" });
      await editMessageText(chatId, messageId, "Filed as Task 📌");
    } else {
      const parsed = pending.parsed as ParsedScheduleItem;
      // This flow only ever produces a plain reminder (the other button files
      // it as a Task instead), so there's no lead-time concept here.
      const item: ParsedScheduleItem = { ...parsed, kind: "reminder", remind_before_days: null };

      await createScheduleItem(item);

      await editMessageText(chatId, messageId, formatScheduleConfirmation(item));
    }

    await supabaseAdmin.from("pending_schedule").delete().eq("id", pendingId);
    return;
  }

  if (action === "habit") {
    const habit = captureId as Habit;
    const logDate = kind;

    await toggleHabit(habit, logDate);
    const panel = await buildHabitPanel(logDate);
    await editMessageText(chatId, messageId, panel.text, panel.keyboard, "Markdown");
    return;
  }
}
