-- Add spotify artist_id to posts for unambiguous artist lookups
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS artist_id text;
