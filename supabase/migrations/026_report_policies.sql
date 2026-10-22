-- Let users check their own report status (to show "already reported" instead
-- of re-prompting), and prevent duplicate reports on the same content.
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

ALTER TABLE public.reports
  ADD CONSTRAINT reports_unique_reporter_content UNIQUE (reporter_id, content_type, content_id);
