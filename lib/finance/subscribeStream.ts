"use client";

/**
 * subscribe() implementation for useRealtimeData, backed by the SSE proxy
 * at /api/finance/stream instead of a direct Supabase Realtime channel --
 * see that route for why (finance_transactions/finance_accounts stay RLS
 * deny-all, no anon exception).
 */
export function subscribeToFinanceStream(onChange: () => void): () => void {
  const eventSource = new EventSource("/api/finance/stream");

  eventSource.onmessage = (event) => {
    if (event.data === "ping") return;
    onChange();
  };

  eventSource.onerror = (err) => {
    console.error("finance stream connection error:", err);
  };

  return () => eventSource.close();
}
