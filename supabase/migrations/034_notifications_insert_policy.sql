-- notifications has only ever had SELECT/UPDATE policies (006_notifications.sql).
-- like/comment/follow/comment_like notifications insert via SECURITY DEFINER
-- triggers, which run as the table owner and bypass RLS, so they were fine.
-- @mention notifications insert directly from client code though, and with
-- RLS enabled and no matching INSERT policy, those inserts were silently
-- denied the entire time the feature has existed.
CREATE POLICY "Users can insert their own mention notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    auth.uid() = actor_id
    AND type IN ('mention', 'mention_post', 'mention_comment')
  );
