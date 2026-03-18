-- Allow users to edit their own comments
CREATE POLICY "Users can edit own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Add 'mention' as a valid notification type
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'follow', 'mention'));
