create table pending_documents (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  message_id text,
  file_id text not null,
  file_name text not null,
  caption_text text,
  subject text check (subject in ('Railway','DSP','MOOC','LIC','Microwave','EngEcon','Entrepreneurship')),
  doc_type text check (doc_type in ('assignment','deadline','notes','pyq','lab')),
  created_at timestamptz default now()
);

alter table pending_documents enable row level security;

create policy "deny all" on pending_documents for all using (false) with check (false);
