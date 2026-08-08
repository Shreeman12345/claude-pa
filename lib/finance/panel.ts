import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TransactionType } from "@/lib/finance/classify";
import { startOfToday } from "@/lib/schedule/datetime";

const OUTFLOW_TYPES: readonly TransactionType[] = ["expense", "bill", "savings", "debt_payment"];

export interface FinanceCategory {
  id: string;
  name: string;
  kind: string;
  expected: number;
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
  const { data, error } = await supabaseAdmin.from("finance_categories").select("id, name, kind, expected");
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

/**
 * Closes the current period, opens a new one starting now with the
 * leftover carried in as rollover_in. Returns the leftover amount.
 */
export async function resetPeriod(): Promise<number | null> {
  const summary = await getPeriodSummary();
  if (!summary) {
    console.error("No active finance_period to reset.");
    return null;
  }

  const leftover = summary.periodNet;
  const now = new Date().toISOString();

  const { error: closeError } = await supabaseAdmin
    .from("finance_periods")
    .update({ ended_at: now })
    .eq("id", summary.period.id);

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

export async function getDebtTotal(): Promise<number> {
  const { data, error } = await supabaseAdmin.from("finance_debts").select("total_owed");
  if (error) {
    console.error("Failed to load finance_debts:", error);
    return 0;
  }
  return (data ?? []).reduce((sum, row) => sum + row.total_owed, 0);
}

/** Assets (sum of account balances) minus total debt owed. */
export async function getNetWorth(): Promise<number> {
  const [accounts, debtTotal] = await Promise.all([getAccounts(), getDebtTotal()]);
  const assetsTotal = accounts.reduce((sum, a) => sum + a.balance, 0);
  return assetsTotal - debtTotal;
}

export interface CategorySummary {
  id: string;
  name: string;
  kind: string;
  expected: number;
  actual: number;
  /** Rounded whole-number percent, or null when expected is 0 (avoids a divide-by-zero). */
  percentage: number | null;
}

export interface PeriodSummary {
  period: FinancePeriod;
  categoriesByKind: Record<string, CategorySummary[]>;
  accounts: FinanceAccount[];
  netWorth: number;
  debtTotal: number;
  /** Income minus outflow for transactions dated today (user's timezone). */
  todayNet: number;
  /** Income minus outflow for the whole period so far -- what rollover_in would become if reset now. */
  periodNet: number;
}

export async function getPeriodSummary(): Promise<PeriodSummary | null> {
  const period = await getCurrentPeriod();
  if (!period) return null;

  const [categories, accounts, debtTotal, txnRes] = await Promise.all([
    getCategories(),
    getAccounts(),
    getDebtTotal(),
    supabaseAdmin
      .from("finance_transactions")
      .select("amount, category_id, occurred_at")
      .eq("period_id", period.id),
  ]);

  if (txnRes.error) {
    console.error("Failed to load transactions for period summary:", txnRes.error);
  }

  const kindByCategory = new Map(categories.map((c) => [c.id, c.kind]));
  const todayStart = startOfToday();

  const actualByCategory = new Map<string, number>();
  let periodIncome = 0;
  let periodOutflow = 0;
  let todayIncome = 0;
  let todayOutflow = 0;

  for (const t of txnRes.data ?? []) {
    actualByCategory.set(t.category_id, (actualByCategory.get(t.category_id) ?? 0) + t.amount);

    const kind = kindByCategory.get(t.category_id);
    const isToday = new Date(t.occurred_at) >= todayStart;
    if (kind === "income") {
      periodIncome += t.amount;
      if (isToday) todayIncome += t.amount;
    } else {
      periodOutflow += t.amount;
      if (isToday) todayOutflow += t.amount;
    }
  }

  const categoriesByKind: Record<string, CategorySummary[]> = {};
  for (const cat of categories) {
    const actual = actualByCategory.get(cat.id) ?? 0;
    const summary: CategorySummary = {
      id: cat.id,
      name: cat.name,
      kind: cat.kind,
      expected: cat.expected,
      actual,
      percentage: cat.expected > 0 ? Math.round((actual / cat.expected) * 100) : null,
    };
    (categoriesByKind[cat.kind] ??= []).push(summary);
  }

  const assetsTotal = accounts.reduce((sum, a) => sum + a.balance, 0);

  return {
    period,
    categoriesByKind,
    accounts,
    netWorth: assetsTotal - debtTotal,
    debtTotal,
    todayNet: todayIncome - todayOutflow,
    periodNet: periodIncome - periodOutflow,
  };
}

export interface TransactionWithDetails {
  id: string;
  amount: number;
  description: string | null;
  occurred_at: string;
  category: { id: string; name: string; kind: string } | null;
  account: { id: string; name: string } | null;
}

export async function getRecentTransactions(limit = 30): Promise<TransactionWithDetails[]> {
  const { data, error } = await supabaseAdmin
    .from("finance_transactions")
    .select("id, amount, description, occurred_at, finance_categories(id, name, kind), finance_accounts(id, name)")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load recent transactions:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    amount: row.amount,
    description: row.description,
    occurred_at: row.occurred_at,
    category: row.finance_categories ?? null,
    account: row.finance_accounts ?? null,
  }));
}

export async function updateCategoryExpected(
  id: string,
  expected: number
): Promise<FinanceCategory | null> {
  const { data, error } = await supabaseAdmin
    .from("finance_categories")
    .update({ expected })
    .eq("id", id)
    .select("id, name, kind, expected")
    .single();

  if (error) {
    console.error("Failed to update category expected amount:", error);
    return null;
  }
  return data;
}

export async function updateAccountBalance(
  id: string,
  balance: number
): Promise<FinanceAccount | null> {
  const { data, error } = await supabaseAdmin
    .from("finance_accounts")
    .update({ balance, balance_updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, balance")
    .single();

  if (error) {
    console.error("Failed to update account balance:", error);
    return null;
  }
  return data;
}
