alter table documents add column summary text;
alter table documents add column difficulty text check (difficulty in ('light','moderate','heavy'));
alter table documents add column estimated_hours numeric;

create table exams (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  subject text check (subject in ('Railway','DSP','MOOC','LIC','Microwave','EngEcon','Entrepreneurship')) not null,
  exam_date date not null,
  portions text,
  scoring_breakdown text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table study_nudges (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  exam_id uuid references exams(id),
  message_sent text,
  sent_at timestamptz default now()
);

alter table exams enable row level security;
alter table study_nudges enable row level security;

create policy "deny all" on exams for all using (false) with check (false);
create policy "deny all" on study_nudges for all using (false) with check (false);
