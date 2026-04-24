-- Migration to add 'tier' column to session_characters

ALTER TABLE public.session_characters 
ADD COLUMN tier text NOT NULL DEFAULT 'medium';

-- Add check constraint for valid tiers
ALTER TABLE public.session_characters
ADD CONSTRAINT chk_character_tier CHECK (tier IN ('full', 'medium', 'summary'));

-- Update existing players to 'full'
UPDATE public.session_characters
SET tier = 'full'
WHERE type = 'player';
