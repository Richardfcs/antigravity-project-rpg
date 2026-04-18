create table if not exists public.session_atlas_pin_characters (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  pin_id uuid not null references public.session_atlas_pins(id) on delete cascade,
  character_id uuid not null references public.session_characters(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists session_atlas_pin_characters_session_pin_idx
  on public.session_atlas_pin_characters (session_id, pin_id, sort_order asc, created_at asc);

create index if not exists session_atlas_pin_characters_character_idx
  on public.session_atlas_pin_characters (character_id);

create unique index if not exists session_atlas_pin_characters_unique_link
  on public.session_atlas_pin_characters (pin_id, character_id);

alter table public.session_atlas_pin_characters enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_atlas_pin_characters'
      and policyname = 'public read session atlas pin characters'
  ) then
    create policy "public read session atlas pin characters"
      on public.session_atlas_pin_characters
      for select
      using (true);
  end if;
end
$$;
