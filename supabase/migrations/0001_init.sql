create extension if not exists vector;

create table raw_captures (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  source text check (source in ('telegram_voice','telegram_text','telegram_button')),
  raw_text text,
  audio_url text,
  classification jsonb,
  routed_to text,
  routed_id uuid,
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  title text not null,
  urgency text check (urgency in ('today','week','month','someday')) not null,
  entity_id uuid null,
  completed_at timestamptz null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  text text not null,
  mood text null,
  created_at timestamptz default now()
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  what_was_decided text not null,
  context text,
  entity_id uuid null,
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  amount numeric not null,
  currency text default 'USD',
  merchant_or_category text,
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create table finance_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  net_worth numeric,
  liquid numeric,
  invested numeric,
  liabilities numeric,
  as_of date not null,
  source text check (source in ('sheet_cron','manual_refresh')),
  created_at timestamptz default now()
);

create table memory_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  source_type text,
  source_id uuid,
  text text,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index memory_chunks_embedding_idx on memory_chunks
  using ivfflat (embedding vector_cosine_ops);

alter table raw_captures enable row level security;
alter table tasks enable row level security;
alter table journal_entries enable row level security;
alter table decisions enable row level security;
alter table expenses enable row level security;
alter table finance_snapshots enable row level security;
alter table memory_chunks enable row level security;

create policy "deny all" on raw_captures for all using (false) with check (false);
create policy "deny all" on tasks for all using (false) with check (false);
create policy "deny all" on journal_entries for all using (false) with check (false);
create policy "deny all" on decisions for all using (false) with check (false);
create policy "deny all" on expenses for all using (false) with check (false);
create policy "deny all" on finance_snapshots for all using (false) with check (false);
create policy "deny all" on memory_chunks for all using (false) with check (false);
