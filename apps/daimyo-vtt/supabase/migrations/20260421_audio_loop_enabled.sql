alter table public.session_audio_state
  add column if not exists loop_enabled boolean not null default false;
