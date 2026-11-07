-- Usernames keep whatever case the user signed up with (GitHub-style)
-- instead of being forced to lowercase, but stay unique and get looked up
-- case-insensitively. The plain UNIQUE(username) constraint is
-- case-sensitive, so it's replaced with a unique index on a generated
-- lowercase column, which all lookups should filter/join on instead of the
-- raw column.
alter table public.profiles
  drop constraint if exists profiles_username_lowercase;

alter table public.profiles
  add constraint profiles_username_alphanumeric check (username ~ '^[A-Za-z0-9]+$');

alter table public.profiles
  drop constraint if exists profiles_username_key;

alter table public.profiles
  add column username_lower text generated always as (lower(username)) stored;

create unique index profiles_username_lower_idx on public.profiles (username_lower);

-- Mobile's profile RPC did a case-sensitive exact match on username; needs
-- the same case-insensitive rule now that case is preserved.
CREATE OR REPLACE FUNCTION public.get_profile_stats(target_username text, requesting_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, username text, avatar_url text, bio text, follower_count bigint, following_count bigint, is_following boolean, is_blocked boolean, total_posts bigint, likes_received bigint, calendar_posts jsonb)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH prof AS (
    SELECT id, username, avatar_url, bio
    FROM public.profiles
    WHERE lower(username) = lower(target_username)
    LIMIT 1
  ),
  post_ids AS (
    SELECT id, posted_date, track_name, artist_name
    FROM public.posts
    WHERE user_id = (SELECT id FROM prof)
  ),
  like_count AS (
    SELECT COUNT(*) AS n
    FROM public.likes
    WHERE post_id IN (SELECT id FROM post_ids)
  ),
  cal AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'posted_date', posted_date,
        'track_name',  track_name,
        'artist_name', artist_name
      ) ORDER BY posted_date
    ) AS data
    FROM post_ids
    WHERE posted_date >= (CURRENT_DATE - INTERVAL '105 days')
  )
  SELECT
    prof.id,
    prof.username::text,
    prof.avatar_url::text,
    prof.bio::text,
    (SELECT COUNT(*) FROM public.follows WHERE following_id = prof.id),
    (SELECT COUNT(*) FROM public.follows WHERE follower_id  = prof.id),
    COALESCE(
      (SELECT COUNT(*) > 0 FROM public.follows
       WHERE follower_id = requesting_user_id AND following_id = prof.id),
      false
    ),
    COALESCE(
      (SELECT COUNT(*) > 0 FROM public.blocks
       WHERE blocker_id = requesting_user_id AND blocked_id = prof.id),
      false
    ),
    (SELECT COUNT(*) FROM post_ids),
    (SELECT n FROM like_count),
    COALESCE((SELECT data FROM cal), '[]'::jsonb)
  FROM prof;
$$;
