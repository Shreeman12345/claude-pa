import { supabaseAdmin } from "@/lib/supabaseAdmin";

// This route streams indefinitely -- must not be statically optimized or cached.
export const dynamic = "force-dynamic";

/**
 * Server-proxy for Realtime on finance_transactions/finance_accounts.
 *
 * Both tables stay fully RLS deny-all with no anon exception (unlike
 * habit_logs/tasks/schedule_items), since financial data shouldn't become
 * anon-readable even for SELECT. This route subscribes to Postgres changes
 * using the service role (bypasses RLS, same as every other supabaseAdmin
 * call in this app) and relays a bare "something changed" ping to the
 * browser over Server-Sent Events -- the browser never gets row contents
 * through this channel, it just knows to refetch via the normal
 * authenticated-by-being-server-side GET routes.
 */
export async function GET() {
  const encoder = new TextEncoder();
  let channel: ReturnType<typeof supabaseAdmin.channel> | null = null;
  let pingInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        } catch {
          // Controller already closed (client disconnected) -- ignore.
        }
      };

      channel = supabaseAdmin
        .channel(`finance-stream-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "finance_transactions" },
          () => send("change")
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "finance_accounts" },
          () => send("change")
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("finance stream subscription failed:", status);
          }
        });

      // Keep-alive so intermediary proxies/browsers don't time the connection out.
      pingInterval = setInterval(() => send("ping"), 30_000);
    },
    cancel() {
      if (channel) supabaseAdmin.removeChannel(channel);
      if (pingInterval) clearInterval(pingInterval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
