create table pending_schedule (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  message_id text,
  raw_text text not null,
  parsed jsonb not null,
  created_at timestamptz default now()
);

alter table pending_schedule enable row level security;

create policy "deny all" on pending_schedule for all using (false) with check (false);
