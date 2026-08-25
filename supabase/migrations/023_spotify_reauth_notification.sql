-- System notifications (e.g. "reconnect Spotify") have no acting user.
ALTER TABLE public.notifications
  ALTER COLUMN actor_id DROP NOT NULL;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'follow', 'mention', 'spotify_reauth'));
