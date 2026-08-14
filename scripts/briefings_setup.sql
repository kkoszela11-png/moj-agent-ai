create table if not exists public.briefings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  content text not null,
  date date not null,
  user_id uuid
);

alter table public.briefings enable row level security;

create index if not exists briefings_created_at_idx
  on public.briefings (created_at desc);