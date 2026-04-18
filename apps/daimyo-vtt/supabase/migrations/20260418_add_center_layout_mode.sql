-- Add 'center' layout mode to session_scenes
alter table session_scenes
  drop constraint if exists session_scenes_layout_mode_check;

alter table session_scenes
  add constraint session_scenes_layout_mode_check
  check (layout_mode in ('line', 'arc', 'grid', 'center'));
