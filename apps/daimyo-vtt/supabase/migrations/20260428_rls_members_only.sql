-- Production hardening: table reads are limited to authenticated session members.

update public.session_participants participant
set auth_user_id = s.owner_user_id
from public.sessions s
where participant.session_id = s.id
  and participant.role = 'gm'
  and participant.auth_user_id is null
  and s.owner_user_id is not null;

create or replace function public.daimyo_is_session_member(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.session_participants participant
    where participant.session_id = p_session_id
      and participant.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.sessions s
    where s.id = p_session_id
      and s.owner_user_id = auth.uid()
  );
$$;

create or replace function public.daimyo_is_session_gm(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.session_participants participant
    where participant.session_id = p_session_id
      and participant.role = 'gm'
      and participant.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.sessions s
    where s.id = p_session_id
      and s.owner_user_id = auth.uid()
  );
$$;

create or replace function public.daimyo_is_participant(p_participant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.session_participants participant
    where participant.id = p_participant_id
      and participant.auth_user_id = auth.uid()
  );
$$;

revoke all on function public.daimyo_is_session_member(uuid) from public;
revoke all on function public.daimyo_is_session_gm(uuid) from public;
revoke all on function public.daimyo_is_participant(uuid) from public;
grant execute on function public.daimyo_is_session_member(uuid) to authenticated;
grant execute on function public.daimyo_is_session_gm(uuid) to authenticated;
grant execute on function public.daimyo_is_participant(uuid) to authenticated;

drop policy if exists "public read sessions" on public.sessions;
drop policy if exists "public read session participants" on public.session_participants;
drop policy if exists "public read assets" on public.assets;
drop policy if exists "public read session characters" on public.session_characters;
drop policy if exists "public read session scenes" on public.session_scenes;
drop policy if exists "public read scene cast" on public.scene_cast;
drop policy if exists "public read session maps" on public.session_maps;
drop policy if exists "public read map tokens" on public.map_tokens;
drop policy if exists "public read session messages" on public.session_messages;
drop policy if exists "public read session audio tracks" on public.session_audio_tracks;
drop policy if exists "public read session audio state" on public.session_audio_state;
drop policy if exists "public read session atlas maps" on public.session_atlas_maps;
drop policy if exists "public read session atlas pins" on public.session_atlas_pins;
drop policy if exists "public read session atlas pin characters" on public.session_atlas_pin_characters;
drop policy if exists "public read session private events" on public.session_private_events;
drop policy if exists "public read session effect layers" on public.session_effect_layers;

create policy "authenticated members read sessions"
  on public.sessions
  for select
  to authenticated
  using (public.daimyo_is_session_member(id));

create policy "authenticated members read session participants"
  on public.session_participants
  for select
  to authenticated
  using (public.daimyo_is_session_member(session_id));

create policy "authenticated members read assets"
  on public.assets
  for select
  to authenticated
  using (public.daimyo_is_session_member(session_id));

create policy "authenticated members read session characters"
  on public.session_characters
  for select
  to authenticated
  using (public.daimyo_is_session_member(session_id));

create policy "authenticated members read session scenes"
  on public.session_scenes
  for select
  to authenticated
  using (public.daimyo_is_session_member(session_id));

create policy "authenticated members read scene cast"
  on public.scene_cast
  for select
  to authenticated
  using (public.daimyo_is_session_member(session_id));

create policy "authenticated members read session maps"
  on public.session_maps
  for select
  to authenticated
  using (public.daimyo_is_session_member(session_id));

create policy "authenticated members read map tokens"
  on public.map_tokens
  for select
  to authenticated
  using (public.daimyo_is_session_member(session_id));

create policy "authenticated members read session messages"
  on public.session_messages
  for select
  to authenticated
  using (public.daimyo_is_session_member(session_id));

create policy "authenticated members read session audio tracks"
  on public.session_audio_tracks
  for select
  to authenticated
  using (public.daimyo_is_session_member(session_id));

create policy "authenticated members read session audio state"
  on public.session_audio_state
  for select
  to authenticated
  using (public.daimyo_is_session_member(session_id));

create policy "authenticated members read session atlas maps"
  on public.session_atlas_maps
  for select
  to authenticated
  using (public.daimyo_is_session_member(session_id));

create policy "authenticated members read session atlas pins"
  on public.session_atlas_pins
  for select
  to authenticated
  using (public.daimyo_is_session_member(session_id));

create policy "authenticated members read session atlas pin characters"
  on public.session_atlas_pin_characters
  for select
  to authenticated
  using (public.daimyo_is_session_member(session_id));

create policy "authenticated scoped read session private events"
  on public.session_private_events
  for select
  to authenticated
  using (
    public.daimyo_is_session_gm(session_id)
    or public.daimyo_is_participant(target_participant_id)
  );

create policy "authenticated members read session effect layers"
  on public.session_effect_layers
  for select
  to authenticated
  using (
    public.daimyo_is_session_gm(session_id)
    or target_participant_id is null
    or public.daimyo_is_participant(target_participant_id)
  );

create policy "authenticated scoped read session notes"
  on public.session_notes
  for select
  to authenticated
  using (
    public.daimyo_is_session_gm(session_id)
    or public.daimyo_is_participant(author_participant_id)
  );

create policy "authenticated scoped read session memory events"
  on public.session_memory_events
  for select
  to authenticated
  using (
    public.daimyo_is_session_gm(session_id)
    or target_participant_id is null
    or public.daimyo_is_participant(target_participant_id)
  );
