create table if not exists public.session_scenes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  background_asset_id uuid references public.assets(id) on delete set null,
  mood_label text not null default '',
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scene_cast (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  scene_id uuid not null references public.session_scenes(id) on delete cascade,
  character_id uuid not null references public.session_characters(id) on delete cascade,
  slot_order integer not null default 0,
  is_spotlighted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists session_scenes_session_id_idx on public.session_scenes (session_id);
create index if not exists session_scenes_sort_order_idx on public.session_scenes (session_id, sort_order asc, created_at asc);
create index if not exists scene_cast_session_id_idx on public.scene_cast (session_id);
create index if not exists scene_cast_scene_id_idx on public.scene_cast (scene_id);
create index if not exists scene_cast_slot_order_idx on public.scene_cast (scene_id, slot_order asc, created_at asc);
create unique index if not exists session_single_active_scene_idx on public.session_scenes (session_id) where is_active;
create unique index if not exists scene_single_spotlight_idx on public.scene_cast (scene_id) where is_spotlighted;
create unique index if not exists scene_unique_character_idx on public.scene_cast (scene_id, character_id);

drop trigger if exists session_scenes_touch_updated_at on public.session_scenes;
create trigger session_scenes_touch_updated_at
before update on public.session_scenes
for each row
execute function public.touch_updated_at();

alter table public.session_scenes enable row level security;
alter table public.scene_cast enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_scenes'
      and policyname = 'public read session scenes'
  ) then
    create policy "public read session scenes"
      on public.session_scenes
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scene_cast'
      and policyname = 'public read scene cast'
  ) then
    create policy "public read scene cast"
      on public.scene_cast
      for select
      using (true);
  end if;
end
$$;
