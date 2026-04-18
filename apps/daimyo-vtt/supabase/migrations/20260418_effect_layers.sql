create table if not exists public.session_effect_layers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  target_participant_id uuid references public.session_participants(id) on delete cascade,
  source_participant_id uuid references public.session_participants(id) on delete set null,
  preset text not null check (
    preset in (
      'sunny',
      'night',
      'city-night',
      'rain',
      'storm',
      'snow',
      'sakura',
      'sand',
      'kegare-medium',
      'kegare-max',
      'injured-light',
      'injured-heavy',
      'downed',
      'tainted-low',
      'tainted-high',
      'tainted-max',
      'calm',
      'joy',
      'sad',
      'silhouette'
    )
  ),
  note text not null default '',
  intensity integer not null default 3 check (intensity between 1 and 5),
  duration_ms integer,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (duration_ms is null or duration_ms between 1500 and 120000)
);

create index if not exists session_effect_layers_session_id_idx
  on public.session_effect_layers (session_id, created_at asc);

create index if not exists session_effect_layers_target_idx
  on public.session_effect_layers (target_participant_id, created_at asc);

alter table public.session_effect_layers enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_effect_layers'
      and policyname = 'public read session effect layers'
  ) then
    create policy "public read session effect layers"
      on public.session_effect_layers
      for select
      using (true);
  end if;
end
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.session_effect_layers;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$$;
