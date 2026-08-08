-- Enables the server-side Realtime subscription behind /api/finance/stream.
--
-- This is deliberately DIFFERENT from 0009/0010/0011: those added an
-- anon-SELECT RLS policy so the browser could subscribe directly. Finance
-- was decided to go the other way -- financial data stays fully deny-all,
-- with the server (service role, via supabaseAdmin) subscribing instead and
-- relaying a bare "something changed" signal over SSE. No RLS change here.
--
-- But the publication step below is NOT an RLS concept -- it's Postgres
-- logical replication, and it's required for ANY subscriber, service role
-- included. Without it, supabaseAdmin's realtime subscription silently
-- receives nothing, regardless of RLS.
alter publication supabase_realtime add table finance_transactions;
alter publication supabase_realtime add table finance_accounts;
