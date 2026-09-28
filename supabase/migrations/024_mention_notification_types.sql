-- The mobile app inserts 'mention_comment' / 'mention_post' notification types
-- (distinct from the web app's single 'mention'), but the constraint never
-- allowed them — every @mention notification from mobile has been silently
-- rejected since that feature shipped.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'follow', 'mention', 'mention_comment', 'mention_post', 'spotify_reauth'));
