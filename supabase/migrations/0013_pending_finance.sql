create table pending_finance (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  message_id text,
  raw_text text not null,
  type text not null check (type in ('expense','income','bill','savings','debt_payment')),
  amount numeric not null,
  category text,
  account text,
  description text,
  created_at timestamptz default now()
);

alter table pending_finance enable row level security;

create policy "deny all" on pending_finance for all using (false) with check (false);
