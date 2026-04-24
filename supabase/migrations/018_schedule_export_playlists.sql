-- Requires pg_cron and pg_net extensions (enable in Dashboard → Database → Extensions)
-- Fill in YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running.

select cron.schedule(
  'export-playlists-daily',
  '0 5 * * *', -- 5 AM UTC = midnight EST (1 AM EDT in summer)
  $$
  select net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/export-playlists',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb
  )
  $$
);
