-- Fix #1 (CRITICAL): Add session_private_events to realtime publication
-- Without this, private events (panic, kegare, secrets) never reach players in real-time.
do $$
begin
  begin
    alter publication supabase_realtime add table public.session_private_events;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$$;

-- Fix #2 (PREVENTIVE): Ensure DELETE payloads always include `old.id`
-- Without REPLICA IDENTITY FULL, DELETE events may arrive with empty `old` payload,
-- preventing the client from removing the deleted record from the local store.
alter table public.sessions replica identity full;
alter table public.assets replica identity full;
alter table public.session_characters replica identity full;
alter table public.session_scenes replica identity full;
alter table public.scene_cast replica identity full;
alter table public.session_maps replica identity full;
alter table public.map_tokens replica identity full;
alter table public.session_audio_tracks replica identity full;
alter table public.session_audio_state replica identity full;
alter table public.session_atlas_maps replica identity full;
alter table public.session_atlas_pins replica identity full;
alter table public.session_atlas_pin_characters replica identity full;
alter table public.session_messages replica identity full;
alter table public.session_effect_layers replica identity full;
alter table public.session_private_events replica identity full;
