create table if not exists public.session_atlas_maps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  asset_id uuid references public.assets(id) on delete set null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_atlas_pins (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  atlas_map_id uuid not null references public.session_atlas_maps(id) on delete cascade,
  title text not null,
  description text not null default '',
  x numeric(7, 3) not null default 50,
  y numeric(7, 3) not null default 50,
  image_asset_id uuid references public.assets(id) on delete set null,
  submap_asset_id uuid references public.assets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_private_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  target_participant_id uuid not null references public.session_participants(id) on delete cascade,
  source_participant_id uuid references public.session_participants(id) on delete set null,
  kind text not null check (kind in ('panic', 'kegare', 'secret', 'blood', 'shake')),
  title text not null,
  body text not null,
  image_asset_id uuid references public.assets(id) on delete set null,
  intensity integer not null default 3 check (intensity between 1 and 5),
  duration_ms integer not null default 5000 check (duration_ms between 800 and 30000),
  is_consumed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists session_atlas_maps_session_id_idx on public.session_atlas_maps (session_id);
create index if not exists session_atlas_maps_created_at_idx on public.session_atlas_maps (session_id, created_at asc);
create index if not exists session_atlas_pins_session_id_idx on public.session_atlas_pins (session_id);
create index if not exists session_atlas_pins_map_id_idx on public.session_atlas_pins (atlas_map_id);
create index if not exists session_private_events_session_target_idx on public.session_private_events (session_id, target_participant_id, created_at asc);
create index if not exists session_private_events_pending_idx on public.session_private_events (target_participant_id, is_consumed, created_at asc);
create unique index if not exists session_single_active_atlas_idx on public.session_atlas_maps (session_id) where is_active;

drop trigger if exists session_atlas_maps_touch_updated_at on public.session_atlas_maps;
create trigger session_atlas_maps_touch_updated_at
before update on public.session_atlas_maps
for each row
execute function public.touch_updated_at();

drop trigger if exists session_atlas_pins_touch_updated_at on public.session_atlas_pins;
create trigger session_atlas_pins_touch_updated_at
before update on public.session_atlas_pins
for each row
execute function public.touch_updated_at();

alter table public.session_atlas_maps enable row level security;
alter table public.session_atlas_pins enable row level security;
alter table public.session_private_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_atlas_maps'
      and policyname = 'public read session atlas maps'
  ) then
    create policy "public read session atlas maps"
      on public.session_atlas_maps
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_atlas_pins'
      and policyname = 'public read session atlas pins'
  ) then
    create policy "public read session atlas pins"
      on public.session_atlas_pins
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_private_events'
      and policyname = 'public read session private events'
  ) then
    create policy "public read session private events"
      on public.session_private_events
      for select
      using (true);
  end if;
end
$$;
