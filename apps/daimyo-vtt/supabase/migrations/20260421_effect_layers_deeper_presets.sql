alter table public.session_effect_layers
  drop constraint if exists session_effect_layers_preset_check;

alter table public.session_effect_layers
  add constraint session_effect_layers_preset_check check (
    preset in (
      'sunny',
      'night',
      'city-night',
      'rain',
      'storm',
      'snow',
      'sakura',
      'sand',
      'kegare-medium',
      'kegare-max',
      'injured-light',
      'injured-heavy',
      'downed',
      'tainted-low',
      'tainted-high',
      'tainted-max',
      'calm',
      'joy',
      'sad',
      'silhouette',
      'whisper-fog',
      'omen-red',
      'void-pressure',
      'fever-dream',
      'revelation',
      'dread'
    )
  );
