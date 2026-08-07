import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendMessage } from "@/lib/telegram/api";
import { categoryKeyboard } from "@/lib/telegram/financeKeyboards";
import { classifyTransaction, TransactionType } from "@/lib/finance/classify";
import {
  getCategories,
  getAccounts,
  createTransaction,
  formatTransactionConfirmation,
  resetPeriod,
} from "@/lib/finance/panel";

/** Returns true if the message was fully handled (transaction-related). */
export async function handleFinanceMessage(message: any): Promise<boolean> {
  const text: string = message.text;
  const [categories, accounts] = await Promise.all([getCategories(), getAccounts()]);

  const classification = await classifyTransaction(
    text,
    categories.map((c) => c.name),
    accounts.map((a) => a.name)
  );

  if (!classification.is_transaction || !classification.type || classification.amount == null) {
    return false;
  }

  const type = classification.type;
  const amount = classification.amount;
  const account = accounts.find((a) => a.name === classification.account) ?? null;
  const category = categories.find((c) => c.name === classification.category) ?? null;

  if (category) {
    const ok = await createTransaction({
      type,
      amount,
      categoryId: category.id,
      accountId: account?.id ?? null,
      description: classification.description,
    });

    if (ok) {
      await sendMessage(
        message.chat.id,
        formatTransactionConfirmation({
          type,
          amount,
          categoryName: category.name,
          accountName: account?.name ?? null,
          description: classification.description,
        })
      );
    } else {
      await sendMessage(message.chat.id, "Something went wrong filing that transaction.");
    }
    return true;
  }

  // Category didn't match anything -- ask, holding the rest in pending_finance.
  const { data: pending, error } = await supabaseAdmin
    .from("pending_finance")
    .insert({
      chat_id: String(message.chat.id),
      message_id: null,
      raw_text: text,
      type,
      amount,
      category: null,
      account: account?.name ?? null,
      description: classification.description,
    })
    .select()
    .single();

  if (error || !pending) {
    console.error("Failed to create pending_finance row:", error);
    return false;
  }

  const sent = await sendMessage(
    message.chat.id,
    `₹${amount} — which category is this?`,
    categoryKeyboard(pending.id, categories)
  );

  if (sent) {
    await supabaseAdmin
      .from("pending_finance")
      .update({ message_id: String(sent.message_id) })
      .eq("id", pending.id);
  }

  return true;
}

/** Resolves a pending_finance row once its category has been picked. */
export async function resolvePendingFinance(
  pendingId: string,
  categoryName: string
): Promise<{ text: string } | null> {
  const { data: pending } = await supabaseAdmin
    .from("pending_finance")
    .select("*")
    .eq("id", pendingId)
    .single();
  if (!pending) return null;

  const [categories, accounts] = await Promise.all([getCategories(), getAccounts()]);
  const category = categories.find((c) => c.name === categoryName);
  if (!category) return null;

  const account = accounts.find((a) => a.name === pending.account) ?? null;

  const ok = await createTransaction({
    type: pending.type as TransactionType,
    amount: pending.amount,
    categoryId: category.id,
    accountId: account?.id ?? null,
    description: pending.description ?? "",
  });

  await supabaseAdmin.from("pending_finance").delete().eq("id", pendingId);

  if (!ok) {
    return { text: "Something went wrong filing that transaction." };
  }

  return {
    text: formatTransactionConfirmation({
      type: pending.type as TransactionType,
      amount: pending.amount,
      categoryName: category.name,
      accountName: account?.name ?? null,
      description: pending.description ?? "",
    }),
  };
}

export async function handlePeriodReset(message: any): Promise<void> {
  const leftover = await resetPeriod();
  if (leftover === null) {
    await sendMessage(message.chat.id, "Couldn't reset the budget period -- something went wrong.");
    return;
  }
  const formatted = `₹${Math.round(leftover).toLocaleString("en-IN")}`;
  await sendMessage(message.chat.id, `📊 New budget period started. Rollover: ${formatted}`);
}
