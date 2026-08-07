-- Enables the dashboard's Realtime subscription on tasks, same pattern as
-- migration 0009 for habit_logs: add to the publication so changes are
-- emitted, plus a scoped anon-SELECT exception to the schema-wide deny-all
-- policy so the browser's Realtime subscription can actually receive them.
-- Every other table stays deny-all.
alter publication supabase_realtime add table tasks;

create policy "anon can read tasks" on tasks
  for select
  to anon
  using (true);
