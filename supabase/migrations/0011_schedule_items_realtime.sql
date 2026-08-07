-- Enables the dashboard's Realtime subscription on schedule_items, same
-- pattern as migrations 0009 (habit_logs) and 0010 (tasks): add to the
-- publication so changes are emitted, plus a scoped anon-SELECT exception
-- to the schema-wide deny-all policy so the browser's Realtime subscription
-- can actually receive them. Every other table stays deny-all.
alter publication supabase_realtime add table schedule_items;

create policy "anon can read schedule_items" on schedule_items
  for select
  to anon
  using (true);
