create table if not exists public.session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  participant_id uuid references public.session_participants(id) on delete set null,
  display_name text not null,
  kind text not null check (kind in ('chat', 'roll', 'system')),
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.session_audio_tracks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('url', 'youtube')),
  source_url text not null,
  playlist_name text not null default 'Geral',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.session_audio_state (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  track_id uuid references public.session_audio_tracks(id) on delete set null,
  status text not null default 'stopped' check (status in ('playing', 'paused', 'stopped')),
  volume numeric(4, 3) not null default 0.72 check (volume between 0 and 1),
  started_at timestamptz,
  position_seconds numeric(10, 3) not null default 0 check (position_seconds >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists session_messages_session_id_idx on public.session_messages (session_id, created_at asc);
create index if not exists session_messages_kind_idx on public.session_messages (session_id, kind, created_at desc);
create index if not exists session_audio_tracks_session_id_idx on public.session_audio_tracks (session_id);
create index if not exists session_audio_tracks_playlist_idx on public.session_audio_tracks (session_id, playlist_name, sort_order asc);

drop trigger if exists session_audio_state_touch_updated_at on public.session_audio_state;
create trigger session_audio_state_touch_updated_at
before update on public.session_audio_state
for each row
execute function public.touch_updated_at();

alter table public.session_messages enable row level security;
alter table public.session_audio_tracks enable row level security;
alter table public.session_audio_state enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_messages'
      and policyname = 'public read session messages'
  ) then
    create policy "public read session messages"
      on public.session_messages
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_audio_tracks'
      and policyname = 'public read session audio tracks'
  ) then
    create policy "public read session audio tracks"
      on public.session_audio_tracks
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_audio_state'
      and policyname = 'public read session audio state'
  ) then
    create policy "public read session audio state"
      on public.session_audio_state
      for select
      using (true);
  end if;
end
$$;
