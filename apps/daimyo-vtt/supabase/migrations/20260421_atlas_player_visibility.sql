alter table public.session_atlas_pins
  add column if not exists is_visible_to_players boolean not null default false,
  add column if not exists is_name_visible_to_players boolean not null default false,
  add column if not exists is_quest_marked boolean not null default false;
