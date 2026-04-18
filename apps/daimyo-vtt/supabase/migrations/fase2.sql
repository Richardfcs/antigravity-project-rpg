create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  gm_name text not null,
  status text not null default 'lobby' check (status in ('lobby', 'active', 'closed')),
  active_scene text not null default 'Portão Sul de Kamamura',
  scene_mood text not null default 'chuva fina + lanternas frias',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('gm', 'player')),
  status text not null default 'offline' check (status in ('online', 'idle', 'offline')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists sessions_code_idx on public.sessions (code);
create index if not exists session_participants_session_id_idx on public.session_participants (session_id);
create unique index if not exists session_single_gm_idx on public.session_participants (session_id, role) where role = 'gm';

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sessions_touch_updated_at on public.sessions;
create trigger sessions_touch_updated_at
before update on public.sessions
for each row
execute function public.touch_updated_at();

alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;
