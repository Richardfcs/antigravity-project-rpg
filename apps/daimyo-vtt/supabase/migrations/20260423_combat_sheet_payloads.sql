alter table public.session_characters
  add column if not exists sheet_profile jsonb null;

alter table public.sessions
  add column if not exists combat_flow jsonb null;

alter table public.session_private_events
  add column if not exists payload jsonb null;

alter table public.session_private_events
  drop constraint if exists session_private_events_kind_check,
  add constraint session_private_events_kind_check
    check (kind in ('panic', 'kegare', 'secret', 'blood', 'shake', 'combat'));
