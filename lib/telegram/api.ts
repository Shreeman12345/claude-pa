type InlineKeyboard = {
  inline_keyboard: { text: string; callback_data: string }[][];
};

async function callTelegram(method: string, payload: Record<string, unknown>) {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      console.error(`Telegram ${method} failed: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error(`Telegram ${method} failed:`, err);
  }
}

export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: InlineKeyboard
) {
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
  });
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: InlineKeyboard
) {
  await callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: replyMarkup ?? { inline_keyboard: [] },
  });
}

export async function answerCallbackQuery(callbackQueryId: string) {
  await callTelegram("answerCallbackQuery", { callback_query_id: callbackQueryId });
}
