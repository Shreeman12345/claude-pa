"use client";

import Panel from "./Panel";
import { useRealtimeData } from "@/lib/hooks/useRealtimeData";
import { subscribeToFinanceStream } from "@/lib/finance/subscribeStream";

interface Summary {
  netWorth: number;
  todayNet: number;
  periodNet: number;
}

async function fetchSummary(): Promise<Summary | null> {
  const res = await fetch("/api/finance/summary");
  if (!res.ok) return null;
  return res.json();
}

function formatRupees(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}₹${Math.round(Math.abs(amount)).toLocaleString("en-IN")}`;
}

function signedRupees(amount: number): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}₹${Math.round(Math.abs(amount)).toLocaleString("en-IN")}`;
}

export default function FinancePulse() {
  const { data: summary } = useRealtimeData<Summary | null>({
    table: "finance",
    initialData: null,
    fetchData: fetchSummary,
    subscribe: subscribeToFinanceStream,
  });

  const netWorth = summary?.netWorth ?? 0;
  const todayNet = summary?.todayNet ?? 0;
  const periodNet = summary?.periodNet ?? 0;
  const periodPositive = periodNet >= 0;

  return (
    <Panel label="07 // FINANCE PULSE" headerRight={<span className="pill pill--accent">LIVE</span>}>
      <div className="label">NET WORTH</div>
      <div className="mono" style={{ fontSize: 28, color: "var(--text-primary)", marginTop: 4 }}>
        {formatRupees(netWorth)}
      </div>
      <div
        className="mono"
        style={{ fontSize: 11, color: periodPositive ? "var(--accent)" : "var(--danger)", marginTop: 2 }}
      >
        {periodPositive ? "▲" : "▼"} {signedRupees(periodNet)} this period
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <div>
          <div className="label">TODAY</div>
          <div
            className="mono"
            style={{
              fontSize: 13,
              color: todayNet >= 0 ? "var(--accent)" : "var(--danger)",
              marginTop: 2,
            }}
          >
            {signedRupees(todayNet)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="label">PERIOD</div>
          <div
            className="mono"
            style={{
              fontSize: 13,
              color: periodPositive ? "var(--accent)" : "var(--danger)",
              marginTop: 2,
            }}
          >
            {signedRupees(periodNet)}
          </div>
        </div>
      </div>
    </Panel>
  );
}
