create table finance_periods (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  started_at timestamptz not null,
  ended_at timestamptz null,
  rollover_in numeric default 0,
  created_at timestamptz default now()
);

create table finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  name text not null,
  kind text check (kind in ('income','expense','bill','savings')) not null,
  expected numeric default 0,
  is_recurring boolean default false,
  created_at timestamptz default now()
);

create table finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  name text not null,
  balance numeric default 0,
  balance_updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table finance_debts (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  total_owed numeric default 0,
  updated_at timestamptz default now()
);

create table finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  period_id uuid references finance_periods(id),
  category_id uuid references finance_categories(id),
  account_id uuid references finance_accounts(id) null,
  amount numeric not null,
  description text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz default now()
);

alter table finance_periods enable row level security;
alter table finance_categories enable row level security;
alter table finance_accounts enable row level security;
alter table finance_debts enable row level security;
alter table finance_transactions enable row level security;

create policy "deny all" on finance_periods for all using (false) with check (false);
create policy "deny all" on finance_categories for all using (false) with check (false);
create policy "deny all" on finance_accounts for all using (false) with check (false);
create policy "deny all" on finance_debts for all using (false) with check (false);
create policy "deny all" on finance_transactions for all using (false) with check (false);

insert into finance_periods (started_at, ended_at) values (now(), null);
