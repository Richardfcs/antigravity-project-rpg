alter table public.assets
  drop constraint if exists assets_kind_check;

alter table public.assets
  add constraint assets_kind_check
  check (kind in ('background', 'token', 'npc', 'portrait', 'map', 'grid', 'ambient'));
