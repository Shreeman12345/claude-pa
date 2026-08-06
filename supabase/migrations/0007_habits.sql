create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  log_date date not null,
  habit text check (habit in ('Gym','Diet','HairSkin','MealPrep','Journaling')) not null,
  done boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (log_date, habit)
);

alter table habit_logs enable row level security;

create policy "deny all" on habit_logs for all using (false) with check (false);
