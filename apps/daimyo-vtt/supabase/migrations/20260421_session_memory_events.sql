create table if not exists public.session_memory_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  actor_participant_id uuid references public.session_participants(id) on delete set null,
  target_participant_id uuid references public.session_participants(id) on delete set null,
  category text not null check (category in ('stage', 'atlas', 'audio', 'private-event')),
  title text not null default '',
  detail text not null default '',
  stage_mode text check (stage_mode in ('theater', 'tactical', 'atlas')),
  atlas_map_id uuid references public.session_atlas_maps(id) on delete cascade,
  atlas_pin_id uuid references public.session_atlas_pins(id) on delete cascade,
  audio_track_id uuid references public.session_audio_tracks(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists session_memory_events_session_idx
  on public.session_memory_events (session_id, created_at desc);

create index if not exists session_memory_events_target_idx
  on public.session_memory_events (target_participant_id, created_at desc);

alter table public.session_memory_events enable row level security;

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

    when 'memory' then
      perform public.reset_session_delete_if_exists('session_memory_events', p_session_id);

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
  perform public.reset_session_dataset_tx(p_session_id, 'memory');

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

grant execute on function public.reset_session_dataset_tx(uuid, text) to service_role;
grant execute on function public.reset_session_content_tx(uuid) to service_role;
