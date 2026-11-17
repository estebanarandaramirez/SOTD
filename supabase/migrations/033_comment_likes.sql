-- Comment likes
CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_likes_read_all"   ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "comment_likes_insert_own" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comment_likes_delete_own" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Notifications: allow 'comment_like', and a comment_id so it can point at the specific comment
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'follow', 'mention', 'mention_comment', 'mention_post', 'spotify_reauth', 'comment_like'));

-- Trigger: comment like → notify comment owner
CREATE OR REPLACE FUNCTION public.notify_on_comment_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE comment_owner uuid; comment_post_id uuid;
BEGIN
  SELECT user_id, post_id INTO comment_owner, comment_post_id FROM public.comments WHERE id = NEW.comment_id;
  IF comment_owner IS DISTINCT FROM NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
    VALUES (comment_owner, NEW.user_id, 'comment_like', comment_post_id, NEW.comment_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_like_insert
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_like();
