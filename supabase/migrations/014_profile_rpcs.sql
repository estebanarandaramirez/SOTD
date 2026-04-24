-- ============================================================
-- get_profile_stats: all profile header data in one round-trip.
-- Returns profile info, follower/following counts, is_following,
-- total post count, total likes received, current streak,
-- and calendar posts (last 15 weeks) as a JSONB array.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_profile_stats(
  target_username    text,
  requesting_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id              uuid,
  username        text,
  avatar_url      text,
  bio             text,
  follower_count  bigint,
  following_count bigint,
  is_following    boolean,
  total_posts     bigint,
  likes_received  bigint,
  calendar_posts  jsonb
)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH prof AS (
    SELECT id, username, avatar_url, bio
    FROM public.profiles
    WHERE username = target_username
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
    (SELECT COUNT(*) FROM post_ids),
    (SELECT n FROM like_count),
    COALESCE((SELECT data FROM cal), '[]'::jsonb)
  FROM prof;
$$;

-- ============================================================
-- get_profile_posts: paginated posts for a profile with counts.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_profile_posts(
  target_user_id     uuid,
  requesting_user_id uuid DEFAULT NULL,
  page_size          int  DEFAULT 20,
  page_offset        int  DEFAULT 0
)
RETURNS TABLE (
  id               uuid,
  user_id          uuid,
  username         text,
  avatar_url       text,
  spotify_track_id text,
  track_name       text,
  artist_name      text,
  album_name       text,
  album_art_url    text,
  preview_url      text,
  note             text,
  genre            text,
  posted_date      date,
  created_at       timestamptz,
  like_count       bigint,
  comment_count    bigint,
  liked_by_me      boolean
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id, p.user_id,
    pr.username::text, pr.avatar_url::text,
    p.spotify_track_id::text, p.track_name::text, p.artist_name::text,
    p.album_name::text, p.album_art_url::text, p.preview_url::text,
    p.note::text, p.genre::text,
    p.posted_date, p.created_at,
    COUNT(DISTINCT l.user_id)::bigint                                        AS like_count,
    COUNT(DISTINCT c.id)::bigint                                             AS comment_count,
    COALESCE(BOOL_OR(l.user_id = requesting_user_id), false)                 AS liked_by_me
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN public.likes    l ON l.post_id = p.id
  LEFT JOIN public.comments c ON c.post_id = p.id
  WHERE p.user_id = target_user_id
  GROUP BY p.id, pr.username, pr.avatar_url
  ORDER BY p.posted_date DESC
  LIMIT page_size OFFSET page_offset;
$$;
