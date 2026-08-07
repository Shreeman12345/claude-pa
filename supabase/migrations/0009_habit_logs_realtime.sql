-- Enables the dashboard's Realtime subscription on habit_logs.
--
-- 1. Add habit_logs to the realtime publication so postgres_changes events
--    are emitted for it at all.
-- 2. Scoped exception to the schema-wide "deny all" RLS policy: the browser
--    subscribes with the anon key, and Realtime only forwards a change to a
--    client if that client's role could SELECT the row. Habit check-ins are
--    low-sensitivity, so anon is allowed to read (but not write) this one
--    table. Every other table stays deny-all.
alter publication supabase_realtime add table habit_logs;

create policy "anon can read habit_logs" on habit_logs
  for select
  to anon
  using (true);
