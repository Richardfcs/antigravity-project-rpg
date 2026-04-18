alter table public.sessions
  add column if not exists owner_user_id uuid references auth.users (id) on delete set null;

alter table public.session_participants
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create index if not exists sessions_owner_user_id_idx
  on public.sessions (owner_user_id);

create index if not exists session_participants_auth_user_id_idx
  on public.session_participants (auth_user_id);

create index if not exists assets_session_kind_updated_idx
  on public.assets (session_id, kind, created_at desc);

create index if not exists assets_session_label_lower_idx
  on public.assets (session_id, lower(label));

create index if not exists session_characters_session_type_updated_idx
  on public.session_characters (session_id, type, updated_at desc);

create index if not exists session_characters_session_name_lower_idx
  on public.session_characters (session_id, lower(name));

create index if not exists session_maps_session_updated_idx
  on public.session_maps (session_id, updated_at desc);

create index if not exists session_maps_session_name_lower_idx
  on public.session_maps (session_id, lower(name));

create index if not exists session_scenes_session_updated_idx
  on public.session_scenes (session_id, updated_at desc);

create index if not exists session_scenes_session_name_lower_idx
  on public.session_scenes (session_id, lower(name));

create index if not exists session_scenes_session_mood_lower_idx
  on public.session_scenes (session_id, lower(mood_label));

create index if not exists session_atlas_maps_session_updated_idx
  on public.session_atlas_maps (session_id, updated_at desc);

create index if not exists session_atlas_maps_session_name_lower_idx
  on public.session_atlas_maps (session_id, lower(name));

create index if not exists session_audio_tracks_session_playlist_sort_idx
  on public.session_audio_tracks (session_id, playlist_name, sort_order);

create index if not exists session_audio_tracks_session_title_lower_idx
  on public.session_audio_tracks (session_id, lower(title));
