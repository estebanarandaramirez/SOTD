-- handle_new_user's email-derived fallback username (and raw client input
-- from app builds predating client-side sanitization) can contain dots,
-- plus-signs, etc. Since 028 added an alphanumeric-only CHECK constraint on
-- profiles.username, an unsanitized value now throws inside the trigger,
-- which runs in the same transaction as the auth.users insert — breaking
-- signup entirely rather than just failing to create a profile row.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username text;
  candidate text;
  suffix int := 0;
BEGIN
  base_username := regexp_replace(
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    '[^A-Za-z0-9]', '', 'g'
  );
  IF base_username = '' THEN
    base_username := 'user';
  END IF;

  candidate := base_username;
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username) VALUES (NEW.id, candidate)
      ON CONFLICT (id) DO NOTHING;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        suffix := suffix + 1;
        candidate := base_username || suffix::text;
    END;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
