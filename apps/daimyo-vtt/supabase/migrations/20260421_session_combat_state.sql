alter table public.sessions
  add column if not exists combat_enabled boolean not null default false,
  add column if not exists combat_round integer not null default 1,
  add column if not exists combat_turn_index integer not null default 0,
  add column if not exists combat_active_token_id uuid null;

alter table public.sessions
  drop constraint if exists sessions_combat_round_positive,
  add constraint sessions_combat_round_positive check (combat_round >= 1);

alter table public.sessions
  drop constraint if exists sessions_combat_turn_index_nonnegative,
  add constraint sessions_combat_turn_index_nonnegative check (combat_turn_index >= 0);
