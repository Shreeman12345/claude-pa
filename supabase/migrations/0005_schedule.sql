create table schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  kind text check (kind in ('class','event','reminder','deadline')) not null,
  title text not null,
  location text null,
  notes text null,
  starts_at timestamptz not null,
  ends_at timestamptz null,
  recurrence text null check (recurrence in ('daily','weekly','monthly','yearly')),
  recurrence_days text null,
  subject text null check (subject in ('Railway','DSP','MOOC','LIC','Microwave','EngEcon','Entrepreneurship')),
  active boolean default true,
  last_fired_at timestamptz null,
  created_at timestamptz default now()
);

alter table schedule_items enable row level security;

create policy "deny all" on schedule_items for all using (false) with check (false);
