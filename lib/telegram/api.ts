type InlineKeyboard = {
  inline_keyboard: { text: string; callback_data: string }[][];
};

async function callTelegram(
  method: string,
  payload: Record<string, unknown>
): Promise<any | null> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok || !data.ok) {
      console.error(`Telegram ${method} failed: ${res.status} ${JSON.stringify(data)}`);
      return null;
    }
    return data.result;
  } catch (err) {
    console.error(`Telegram ${method} failed:`, err);
    return null;
  }
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: InlineKeyboard
): Promise<{ message_id: number } | null> {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
  });
}

export async function editMessageText(
  chatId: number | string,
  messageId: number | string,
  text: string,
  replyMarkup?: InlineKeyboard
): Promise<any | null> {
  return callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: replyMarkup ?? { inline_keyboard: [] },
  });
}

export async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  await callTelegram("answerCallbackQuery", { callback_query_id: callbackQueryId });
}
