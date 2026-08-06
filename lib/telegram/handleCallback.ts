import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { editMessageText, answerCallbackQuery } from "@/lib/telegram/api";
import {
  routeCapture,
  defaultFieldsFromRawText,
  CaptureKind,
} from "@/lib/router/routeCapture";

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
}
