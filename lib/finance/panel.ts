import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TransactionType } from "@/lib/finance/classify";

const OUTFLOW_TYPES: readonly TransactionType[] = ["expense", "bill", "savings", "debt_payment"];

export interface FinanceCategory {
  id: string;
  name: string;
  kind: string;
}

export interface FinanceAccount {
  id: string;
  name: string;
  balance: number;
}

export interface FinancePeriod {
  id: string;
  started_at: string;
  ended_at: string | null;
  rollover_in: number;
}

export async function getCategories(): Promise<FinanceCategory[]> {
  const { data, error } = await supabaseAdmin.from("finance_categories").select("id, name, kind");
  if (error) {
    console.error("Failed to load finance_categories:", error);
    return [];
  }
  return data ?? [];
}

export async function getAccounts(): Promise<FinanceAccount[]> {
  const { data, error } = await supabaseAdmin.from("finance_accounts").select("id, name, balance");
  if (error) {
    console.error("Failed to load finance_accounts:", error);
    return [];
  }
  return data ?? [];
}

export async function getCurrentPeriod(): Promise<FinancePeriod | null> {
  const { data, error } = await supabaseAdmin
    .from("finance_periods")
    .select("id, started_at, ended_at, rollover_in")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load current finance_period:", error);
    return null;
  }
  return data;
}

const EMOJI: Record<TransactionType, string> = {
  expense: "💸",
  income: "💰",
  bill: "🧾",
  savings: "🏦",
  debt_payment: "💳",
};

function formatRupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatTransactionConfirmation(params: {
  type: TransactionType;
  amount: number;
  categoryName: string;
  accountName: string | null;
  description: string;
}): string {
  const { type, amount, categoryName, accountName, description } = params;
  const accountPart = accountName ? ` (${accountName})` : "";
  const descPart = description ? ` — ${description}` : "";
  return `${EMOJI[type]} ${formatRupees(amount)} — ${categoryName}${accountPart}${descPart}`;
}

/**
 * Inserts the transaction against the current active period and, if an
 * account was identified, adjusts that account's balance -- subtracting for
 * every outflow type (expense/bill/savings/debt_payment all move money OUT
 * of the account) and adding for income.
 */
export async function createTransaction(params: {
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string | null;
  description: string;
}): Promise<boolean> {
  const period = await getCurrentPeriod();
  if (!period) {
    console.error("No active finance_period to file transaction against.");
    return false;
  }

  const { error: insertError } = await supabaseAdmin.from("finance_transactions").insert({
    period_id: period.id,
    category_id: params.categoryId,
    account_id: params.accountId,
    amount: params.amount,
    description: params.description,
  });

  if (insertError) {
    console.error("Failed to insert finance_transaction:", insertError);
    return false;
  }

  if (params.accountId) {
    const delta = OUTFLOW_TYPES.includes(params.type) ? -params.amount : params.amount;
    const { data: account, error: fetchError } = await supabaseAdmin
      .from("finance_accounts")
      .select("balance")
      .eq("id", params.accountId)
      .single();

    if (fetchError || !account) {
      console.error("Failed to read account balance before adjusting:", fetchError);
      return true; // transaction is filed; balance adjustment is best-effort
    }

    const { error: updateError } = await supabaseAdmin
      .from("finance_accounts")
      .update({ balance: account.balance + delta, balance_updated_at: new Date().toISOString() })
      .eq("id", params.accountId);

    if (updateError) {
      console.error("Failed to adjust account balance:", updateError);
    }
  }

  return true;
}

/** Sum of income minus sum of every outflow type, for a given period. */
async function periodLeftover(periodId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("finance_transactions")
    .select("amount, category_id, finance_categories(kind)")
    .eq("period_id", periodId);

  if (error || !data) {
    console.error("Failed to load transactions for period leftover:", error);
    return 0;
  }

  let income = 0;
  let outflow = 0;
  for (const row of data as any[]) {
    const kind = row.finance_categories?.kind;
    if (kind === "income") income += row.amount;
    else outflow += row.amount;
  }
  return income - outflow;
}

/**
 * Closes the current period, opens a new one starting now with the
 * leftover carried in as rollover_in. Returns the leftover amount.
 */
export async function resetPeriod(): Promise<number | null> {
  const current = await getCurrentPeriod();
  if (!current) {
    console.error("No active finance_period to reset.");
    return null;
  }

  const leftover = await periodLeftover(current.id);
  const now = new Date().toISOString();

  const { error: closeError } = await supabaseAdmin
    .from("finance_periods")
    .update({ ended_at: now })
    .eq("id", current.id);

  if (closeError) {
    console.error("Failed to close current finance_period:", closeError);
    return null;
  }

  const { error: insertError } = await supabaseAdmin
    .from("finance_periods")
    .insert({ started_at: now, ended_at: null, rollover_in: leftover });

  if (insertError) {
    console.error("Failed to insert new finance_period:", insertError);
    return null;
  }

  return leftover;
}
