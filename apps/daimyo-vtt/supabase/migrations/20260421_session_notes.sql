create table if not exists public.session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  author_participant_id uuid not null references public.session_participants(id) on delete cascade,
  kind text not null check (kind in ('scene', 'map', 'atlas', 'journal')),
  scope_key text not null,
  title text not null default '',
  body text not null default '',
  scene_id uuid references public.session_scenes(id) on delete cascade,
  map_id uuid references public.session_maps(id) on delete cascade,
  atlas_map_id uuid references public.session_atlas_maps(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists session_notes_scope_unique
  on public.session_notes (session_id, author_participant_id, kind, scope_key);

create index if not exists session_notes_session_id_idx
  on public.session_notes (session_id, updated_at asc);

create index if not exists session_notes_author_idx
  on public.session_notes (author_participant_id, updated_at asc);

alter table public.session_notes enable row level security;

create or replace function public.reset_session_dataset_tx(
  p_session_id uuid,
  p_dataset text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  case p_dataset
    when 'maps' then
      perform public.reset_session_delete_if_exists('map_tokens', p_session_id);
      perform public.reset_session_delete_if_exists('session_maps', p_session_id);
      update public.sessions
      set active_map_id = null
      where id = p_session_id;

    when 'scenes' then
      perform public.reset_session_delete_if_exists('scene_cast', p_session_id);
      perform public.reset_session_delete_if_exists('session_scenes', p_session_id);
      update public.sessions
      set active_scene = 'Sem palco ativo',
          active_scene_id = null,
          scene_mood = 'aguardando preparacao'
      where id = p_session_id;

    when 'atlas' then
      perform public.reset_session_delete_if_exists('session_atlas_pin_characters', p_session_id);
      perform public.reset_session_delete_if_exists('session_atlas_pins', p_session_id);
      perform public.reset_session_delete_if_exists('session_atlas_maps', p_session_id);
      update public.sessions
      set active_atlas_map_id = null
      where id = p_session_id;

    when 'characters' then
      perform public.reset_session_delete_if_exists('session_characters', p_session_id);

    when 'assets' then
      perform public.reset_session_delete_if_exists('assets', p_session_id);

    when 'audio' then
      perform public.reset_session_delete_if_exists('session_audio_state', p_session_id);
      perform public.reset_session_delete_if_exists('session_audio_tracks', p_session_id);

    when 'chat' then
      perform public.reset_session_delete_if_exists('session_messages', p_session_id);

    when 'effects' then
      perform public.reset_session_delete_if_exists('session_effect_layers', p_session_id);
      perform public.reset_session_delete_if_exists('session_private_events', p_session_id);

    when 'notes' then
      perform public.reset_session_delete_if_exists('session_notes', p_session_id);

    else
      raise exception 'Unsupported dataset: %', p_dataset
        using errcode = '22023';
  end case;
end;
$$;

create or replace function public.reset_session_content_tx(
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.reset_session_dataset_tx(p_session_id, 'effects');
  perform public.reset_session_dataset_tx(p_session_id, 'chat');
  perform public.reset_session_dataset_tx(p_session_id, 'audio');
  perform public.reset_session_dataset_tx(p_session_id, 'atlas');
  perform public.reset_session_dataset_tx(p_session_id, 'maps');
  perform public.reset_session_dataset_tx(p_session_id, 'scenes');
  perform public.reset_session_dataset_tx(p_session_id, 'characters');
  perform public.reset_session_dataset_tx(p_session_id, 'assets');
  perform public.reset_session_dataset_tx(p_session_id, 'notes');

  update public.sessions
  set active_scene = 'Sem palco ativo',
      active_scene_id = null,
      active_map_id = null,
      active_atlas_map_id = null,
      active_stage_mode = 'theater',
      presentation_mode = 'standard',
      scene_mood = 'aguardando preparacao'
  where id = p_session_id;
end;
$$;
