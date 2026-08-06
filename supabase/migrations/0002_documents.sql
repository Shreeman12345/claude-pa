create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  subject text check (subject in ('Railway','DSP','MOOC','LIC','Microwave','EngEcon','Entrepreneurship')) not null,
  doc_type text check (doc_type in ('assignment','deadline','notes','pyq','lab')) not null,
  file_name text not null,
  storage_path text not null,
  caption_text text,
  created_at timestamptz default now()
);

alter table documents enable row level security;

create policy "deny all" on documents for all using (false) with check (false);
