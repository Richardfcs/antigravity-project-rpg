alter table public.sessions
  add column if not exists presentation_mode text not null default 'standard';

alter table public.sessions
  drop constraint if exists sessions_presentation_mode_check;

alter table public.sessions
  add constraint sessions_presentation_mode_check
  check (presentation_mode in ('standard', 'immersive'));

update public.sessions
set presentation_mode = coalesce(presentation_mode, 'standard');

alter table public.session_scenes
  add column if not exists layout_mode text not null default 'line';

alter table public.session_scenes
  drop constraint if exists session_scenes_layout_mode_check;

alter table public.session_scenes
  add constraint session_scenes_layout_mode_check
  check (layout_mode in ('line', 'arc', 'grid'));

update public.session_scenes
set layout_mode = coalesce(layout_mode, 'line');

alter table public.session_audio_tracks
  add column if not exists source_public_id text not null default '',
  add column if not exists cloudinary_resource_type text not null default 'video',
  add column if not exists mime_type text,
  add column if not exists original_filename text,
  add column if not exists duration_seconds numeric(10, 3);

update public.session_audio_tracks
set
  source_type = 'upload',
  source_public_id = case
    when coalesce(source_public_id, '') <> '' then source_public_id
    else source_url
  end,
  cloudinary_resource_type = 'video'
where
  source_type <> 'upload'
  or coalesce(source_public_id, '') = ''
  or cloudinary_resource_type <> 'video';

alter table public.session_audio_tracks
  drop constraint if exists session_audio_tracks_source_type_check;

alter table public.session_audio_tracks
  add constraint session_audio_tracks_source_type_check
  check (source_type in ('upload'));

alter table public.session_audio_tracks
  drop constraint if exists session_audio_tracks_cloudinary_resource_type_check;

alter table public.session_audio_tracks
  add constraint session_audio_tracks_cloudinary_resource_type_check
  check (cloudinary_resource_type in ('video'));

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'map_tokens'
      and column_name = 'visible'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'map_tokens'
      and column_name = 'is_visible_to_players'
  ) then
    alter table public.map_tokens rename column visible to is_visible_to_players;
  end if;
end
$$;

alter table public.map_tokens
  alter column character_id drop not null;

alter table public.map_tokens
  add column if not exists label text not null default '',
  add column if not exists is_visible_to_players boolean not null default true;

update public.map_tokens as token
set label = coalesce(nullif(token.label, ''), characters.name, 'Token')
from public.session_characters as characters
where token.character_id = characters.id;

update public.map_tokens
set label = coalesce(nullif(label, ''), 'Token');

drop index if exists public.map_unique_character_idx;

create unique index if not exists map_unique_character_idx
on public.map_tokens (map_id, character_id)
where character_id is not null;
