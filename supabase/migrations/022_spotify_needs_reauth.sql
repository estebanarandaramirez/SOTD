-- Spotify refresh tokens now expire after 6 months (Spotify policy change, July 2026).
-- When a refresh attempt returns invalid_grant, the export job discards the dead token
-- and flags the row so the UI can prompt the user to reconnect rather than silently
-- retrying a token that will never work again.
ALTER TABLE public.spotify_exports
  ADD COLUMN needs_reauth boolean NOT NULL DEFAULT false;
