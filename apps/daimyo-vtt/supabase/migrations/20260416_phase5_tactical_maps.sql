alter table public.sessions
  add column if not exists active_stage_mode text not null default 'theater'
  check (active_stage_mode in ('theater', 'tactical', 'atlas'));

update public.sessions
set active_stage_mode = coalesce(active_stage_mode, 'theater');

create table if not exists public.session_maps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  background_asset_id uuid references public.assets(id) on delete set null,
  grid_enabled boolean not null default true,
  grid_size integer not null default 64 check (grid_size between 16 and 256),
  width integer not null default 1600 check (width between 320 and 8192),
  height integer not null default 900 check (height between 240 and 8192),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.map_tokens (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  map_id uuid not null references public.session_maps(id) on delete cascade,
  character_id uuid not null references public.session_characters(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete set null,
  x numeric(7, 3) not null default 50,
  y numeric(7, 3) not null default 50,
  scale numeric(6, 3) not null default 1,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_maps_session_id_idx on public.session_maps (session_id);
create index if not exists session_maps_created_at_idx on public.session_maps (session_id, created_at asc);
create index if not exists map_tokens_session_id_idx on public.map_tokens (session_id);
create index if not exists map_tokens_map_id_idx on public.map_tokens (map_id);
create index if not exists map_tokens_character_id_idx on public.map_tokens (character_id);
create unique index if not exists session_single_active_map_idx on public.session_maps (session_id) where is_active;
create unique index if not exists map_unique_character_idx on public.map_tokens (map_id, character_id);

drop trigger if exists session_maps_touch_updated_at on public.session_maps;
create trigger session_maps_touch_updated_at
before update on public.session_maps
for each row
execute function public.touch_updated_at();

drop trigger if exists map_tokens_touch_updated_at on public.map_tokens;
create trigger map_tokens_touch_updated_at
before update on public.map_tokens
for each row
execute function public.touch_updated_at();

alter table public.session_maps enable row level security;
alter table public.map_tokens enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_maps'
      and policyname = 'public read session maps'
  ) then
    create policy "public read session maps"
      on public.session_maps
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'map_tokens'
      and policyname = 'public read map tokens'
  ) then
    create policy "public read map tokens"
      on public.map_tokens
      for select
      using (true);
  end if;
end
$$;
