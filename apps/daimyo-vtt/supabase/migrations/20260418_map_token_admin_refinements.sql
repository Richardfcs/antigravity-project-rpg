alter table public.session_maps
  add column if not exists default_ally_asset_id uuid references public.assets(id) on delete set null,
  add column if not exists default_enemy_asset_id uuid references public.assets(id) on delete set null,
  add column if not exists default_neutral_asset_id uuid references public.assets(id) on delete set null;

alter table public.map_tokens
  add column if not exists faction text,
  add column if not exists status_effects text[] not null default '{}';

do $$
begin
  alter table public.map_tokens
    drop constraint if exists map_tokens_faction_check;

  alter table public.map_tokens
    add constraint map_tokens_faction_check
    check (faction is null or faction in ('ally', 'enemy', 'neutral'));

  alter table public.map_tokens
    drop constraint if exists map_tokens_status_effects_check;

  alter table public.map_tokens
    add constraint map_tokens_status_effects_check
    check (
      status_effects <@ array[
        'dead',
        'poisoned',
        'sleeping',
        'wounded',
        'stunned',
        'hidden',
        'burning',
        'cursed'
      ]::text[]
    );
end
$$;

create index if not exists map_tokens_faction_idx
  on public.map_tokens (map_id, faction);

create index if not exists session_maps_default_ally_asset_id_idx
  on public.session_maps (default_ally_asset_id);

create index if not exists session_maps_default_enemy_asset_id_idx
  on public.session_maps (default_enemy_asset_id);

create index if not exists session_maps_default_neutral_asset_id_idx
  on public.session_maps (default_neutral_asset_id);
