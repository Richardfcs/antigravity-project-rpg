alter table public.sessions
  add column if not exists active_scene_id uuid,
  add column if not exists active_map_id uuid,
  add column if not exists active_atlas_map_id uuid;

do $$
begin
  if to_regclass('public.session_scenes') is not null then
    update public.sessions as session
    set active_scene_id = scene.id
    from public.session_scenes as scene
    where scene.session_id = session.id
      and scene.is_active = true;
  end if;

  if to_regclass('public.session_maps') is not null then
    update public.sessions as session
    set active_map_id = map.id
    from public.session_maps as map
    where map.session_id = session.id
      and map.is_active = true;
  end if;

  if to_regclass('public.session_atlas_maps') is not null then
    update public.sessions as session
    set active_atlas_map_id = atlas.id
    from public.session_atlas_maps as atlas
    where atlas.session_id = session.id
      and atlas.is_active = true;
  end if;
end
$$;

do $$
declare
  publication_name text := 'supabase_realtime';
  target_table text;
  target_tables text[] := array[
    'public.sessions',
    'public.assets',
    'public.session_characters',
    'public.session_scenes',
    'public.scene_cast',
    'public.session_maps',
    'public.map_tokens',
    'public.session_audio_tracks',
    'public.session_audio_state',
    'public.session_atlas_maps',
    'public.session_atlas_pins',
    'public.session_atlas_pin_characters',
    'public.session_messages'
  ];
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = publication_name
  ) then
    execute format('create publication %I', publication_name);
  end if;

  foreach target_table in array target_tables
  loop
    if to_regclass(target_table) is null then
      continue;
    end if;

    if not exists (
      select 1
      from pg_publication_rel relation
      join pg_publication publication
        on publication.oid = relation.prpubid
      where publication.pubname = publication_name
        and relation.prrelid = to_regclass(target_table)
    ) then
      execute format('alter publication %I add table %s', publication_name, target_table);
    end if;
  end loop;
end
$$;
