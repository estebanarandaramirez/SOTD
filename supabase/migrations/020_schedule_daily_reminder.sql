-- Requires pg_cron and pg_net extensions (enable in Dashboard → Database → Extensions)
-- Fill in twegdrptmgoodyxyshda and sotd-webhook-2026 before running.
--
-- We schedule at BOTH 00:00 UTC (covers 8 PM EDT, UTC-4) and 01:00 UTC (covers 8 PM EST, UTC-5).
-- The function itself guards against running twice by checking the actual Eastern hour.

select cron.schedule(
  'daily-reminder-edt',
  '0 0 * * *',
  $$
  select net.http_post(
    url     := 'https://twegdrptmgoodyxyshda.supabase.co/functions/v1/daily-reminder',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret',  'sotd-webhook-2026'
    ),
    body    := '{}'::jsonb
  )
  $$
);

select cron.schedule(
  'daily-reminder-est',
  '0 1 * * *',
  $$
  select net.http_post(
    url     := 'https://twegdrptmgoodyxyshda.supabase.co/functions/v1/daily-reminder',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret',  'sotd-webhook-2026'
    ),
    body    := '{}'::jsonb
  )
  $$
);
