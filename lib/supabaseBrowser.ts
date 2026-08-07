import { createClient } from "@supabase/supabase-js";

/**
 * Anon-key client for browser use only. Never import supabaseAdmin
 * (service role) into a client component -- that key must not ship to
 * the browser. RLS is deny-all everywhere except the scoped exceptions
 * granted for Realtime reads (see supabase/migrations/0009_habit_logs_realtime.sql).
 */
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
