create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  owner_participant_id uuid references public.session_participants(id) on delete set null,
  kind text not null check (kind in ('background', 'token', 'npc', 'portrait', 'map', 'ambient')),
  label text not null,
  public_id text not null,
  secure_url text not null,
  width integer,
  height integer,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.session_characters (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  type text not null check (type in ('player', 'npc')),
  owner_participant_id uuid references public.session_participants(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  hp integer not null default 10,
  hp_max integer not null default 10,
  fp integer not null default 10,
  fp_max integer not null default 10,
  initiative integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assets_session_id_idx on public.assets (session_id);
create index if not exists assets_owner_participant_id_idx on public.assets (owner_participant_id);
create index if not exists session_characters_session_id_idx on public.session_characters (session_id);
create index if not exists session_characters_owner_participant_id_idx on public.session_characters (owner_participant_id);
create index if not exists session_characters_asset_id_idx on public.session_characters (asset_id);
create index if not exists session_characters_initiative_idx on public.session_characters (session_id, initiative desc, created_at asc);

drop trigger if exists session_characters_touch_updated_at on public.session_characters;
create trigger session_characters_touch_updated_at
before update on public.session_characters
for each row
execute function public.touch_updated_at();

alter table public.assets enable row level security;
alter table public.session_characters enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sessions'
      and policyname = 'public read sessions'
  ) then
    create policy "public read sessions"
      on public.sessions
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_participants'
      and policyname = 'public read session participants'
  ) then
    create policy "public read session participants"
      on public.session_participants
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'assets'
      and policyname = 'public read assets'
  ) then
    create policy "public read assets"
      on public.assets
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_characters'
      and policyname = 'public read session characters'
  ) then
    create policy "public read session characters"
      on public.session_characters
      for select
      using (true);
  end if;
end
$$;
