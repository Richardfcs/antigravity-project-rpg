create or replace function public.reset_session_delete_if_exists(
  p_table text,
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass(format('public.%s', p_table)) is not null then
    execute format('delete from public.%I where session_id = $1', p_table)
    using p_session_id;
  end if;
end;
$$;

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

grant execute on function public.reset_session_delete_if_exists(text, uuid) to service_role;
grant execute on function public.reset_session_dataset_tx(uuid, text) to service_role;
grant execute on function public.reset_session_content_tx(uuid) to service_role;
