"use client";

import { CSSProperties } from "react";
import Shell from "../components/Shell";
import Panel from "../components/Panel";
import TopNav from "../components/TopNav";
import { useRealtimeData } from "@/lib/hooks/useRealtimeData";
import { subscribeToFinanceStream } from "@/lib/finance/subscribeStream";

interface CategorySummary {
  id: string;
  name: string;
  kind: string;
  expected: number;
  actual: number;
  percentage: number | null;
}

interface FinanceAccount {
  id: string;
  name: string;
  balance: number;
}

interface FinancePeriod {
  id: string;
  started_at: string;
  ended_at: string | null;
  rollover_in: number;
}

interface PeriodSummary {
  period: FinancePeriod;
  categoriesByKind: Record<string, CategorySummary[]>;
  accounts: FinanceAccount[];
  netWorth: number;
  debtTotal: number;
  todayNet: number;
  periodNet: number;
}

interface TransactionRow {
  id: string;
  amount: number;
  description: string | null;
  occurred_at: string;
  category: { id: string; name: string; kind: string } | null;
  account: { id: string; name: string } | null;
}

const KIND_ORDER = ["income", "expense", "bill", "savings"];
const KIND_LABELS: Record<string, string> = {
  income: "INCOME",
  expense: "EXPENSE",
  bill: "BILLS",
  savings: "SAVINGS",
};

function formatRupees(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}₹${Math.round(Math.abs(amount)).toLocaleString("en-IN")}`;
}

async function fetchSummary(): Promise<PeriodSummary | null> {
  const res = await fetch("/api/finance/summary");
  if (!res.ok) return null;
  return res.json();
}

async function fetchTransactions(): Promise<TransactionRow[]> {
  const res = await fetch("/api/finance/transactions?limit=50");
  const data = await res.json();
  return data.transactions;
}

const fieldStyle: CSSProperties = {
  background: "var(--bg-1)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-inner)",
  padding: "4px 8px",
  fontSize: 12,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  outline: "none",
  width: 90,
  textAlign: "right",
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 0",
};

export default function FinancePage() {
  const { data: summary, mutate: mutateSummary } = useRealtimeData<PeriodSummary | null>({
    table: "finance",
    initialData: null,
    fetchData: fetchSummary,
    subscribe: subscribeToFinanceStream,
  });

  const { data: transactions } = useRealtimeData<TransactionRow[]>({
    table: "finance-transactions",
    initialData: [],
    fetchData: fetchTransactions,
    subscribe: subscribeToFinanceStream,
  });

  const updateExpected = (categoryId: string, expected: number) => {
    mutateSummary(
      (prev) => {
        if (!prev) return prev;
        const next: Record<string, CategorySummary[]> = {};
        for (const [kind, cats] of Object.entries(prev.categoriesByKind)) {
          next[kind] = cats.map((c) =>
            c.id === categoryId
              ? { ...c, expected, percentage: expected > 0 ? Math.round((c.actual / expected) * 100) : null }
              : c
          );
        }
        return { ...prev, categoriesByKind: next };
      },
      async () => {
        const res = await fetch(`/api/finance/categories/${categoryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expected }),
        });
        const data = await res.json();
        return data.summary;
      }
    );
  };

  const updateBalance = (accountId: string, balance: number) => {
    mutateSummary(
      (prev) =>
        prev
          ? { ...prev, accounts: prev.accounts.map((a) => (a.id === accountId ? { ...a, balance } : a)) }
          : prev,
      async () => {
        const res = await fetch(`/api/finance/accounts/${accountId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ balance }),
        });
        const data = await res.json();
        return data.summary;
      }
    );
  };

  return (
    <>
      <TopNav />
      <Shell>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <Panel label="FINANCE // OVERVIEW" headerRight={<span className="pill pill--accent">LIVE</span>}>
            <div style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap" }}>
              <div>
                <div className="label">NET WORTH</div>
                <div className="mono" style={{ fontSize: 24, color: "var(--text-primary)", marginTop: 4 }}>
                  {summary ? formatRupees(summary.netWorth) : "—"}
                </div>
              </div>
              <div>
                <div className="label">DEBT TOTAL</div>
                <div
                  className="mono"
                  style={{
                    fontSize: 24,
                    color: summary && summary.debtTotal > 0 ? "var(--danger)" : "var(--text-primary)",
                    marginTop: 4,
                  }}
                >
                  {summary ? formatRupees(summary.debtTotal) : "—"}
                </div>
              </div>
              <div>
                <div className="label">ROLLOVER IN</div>
                <div className="mono" style={{ fontSize: 24, color: "var(--text-primary)", marginTop: 4 }}>
                  {summary ? formatRupees(summary.period.rollover_in) : "—"}
                </div>
              </div>
              <div>
                <div className="label">PERIOD NET</div>
                <div
                  className="mono"
                  style={{
                    fontSize: 24,
                    color: summary && summary.periodNet >= 0 ? "var(--accent)" : "var(--danger)",
                    marginTop: 4,
                  }}
                >
                  {summary ? formatRupees(summary.periodNet) : "—"}
                </div>
              </div>
            </div>
          </Panel>

          {KIND_ORDER.map((kind) => {
            const cats = summary?.categoriesByKind[kind] ?? [];
            return (
              <Panel key={kind} label={`FINANCE // ${KIND_LABELS[kind]}`}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {cats.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No categories.</div>
                  ) : (
                    cats.map((c) => {
                      const pct = c.percentage;
                      const barPct = pct === null ? 0 : Math.min(pct, 100);
                      const over = pct !== null && pct > 100;
                      return (
                        <div key={c.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{c.name}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span className="mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                                {formatRupees(c.actual)} /
                              </span>
                              <input
                                key={`${c.id}-${c.expected}`}
                                className="mono"
                                style={fieldStyle}
                                defaultValue={c.expected}
                                onBlur={(e) => {
                                  const n = Number(e.target.value);
                                  if (!Number.isNaN(n) && n !== c.expected) updateExpected(c.id, n);
                                }}
                              />
                            </div>
                          </div>
                          <div
                            style={{
                              height: 4,
                              background: "var(--border)",
                              borderRadius: "var(--radius-pill)",
                              marginTop: 6,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${barPct}%`,
                                background: over ? "var(--danger)" : "var(--accent)",
                                borderRadius: "var(--radius-pill)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Panel>
            );
          })}

          <Panel label="FINANCE // ACCOUNTS">
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(summary?.accounts ?? []).map((a, i, arr) => (
                <div
                  key={a.id}
                  style={{ ...rowStyle, borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{a.name}</span>
                  <input
                    key={`${a.id}-${a.balance}`}
                    className="mono"
                    style={fieldStyle}
                    defaultValue={a.balance}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isNaN(n) && n !== a.balance) updateBalance(a.id, n);
                    }}
                  />
                </div>
              ))}
            </div>
          </Panel>

          <Panel label="FINANCE // RECENT TRANSACTIONS">
            <div style={{ display: "flex", flexDirection: "column" }}>
              {transactions.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "10px 0" }}>
                  No transactions yet.
                </div>
              ) : (
                transactions.map((t, i) => (
                  <div
                    key={t.id}
                    style={{
                      ...rowStyle,
                      borderBottom: i < transactions.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>
                        {t.category?.name ?? "Uncategorized"}
                        {t.account ? ` · ${t.account.name}` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                        {t.description || "—"}
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: 13, color: "var(--text-primary)", flexShrink: 0 }}>
                      {formatRupees(t.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </Shell>
    </>
  );
}
