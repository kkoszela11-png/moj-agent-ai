create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null,
  data jsonb not null,
  analysis text not null
);

alter table public.webhook_events enable row level security;

create index if not exists webhook_events_created_at_idx
  on public.webhook_events (created_at desc);

create index if not exists webhook_events_type_idx
  on public.webhook_events (type);
