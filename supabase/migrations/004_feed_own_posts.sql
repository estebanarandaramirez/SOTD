-- ============================================================
-- SOTD – Migration 004
-- Update get_feed to include the requesting user's own posts
-- ============================================================

DROP FUNCTION IF EXISTS public.get_feed(uuid, date);

CREATE OR REPLACE FUNCTION public.get_feed(
  requesting_user_id uuid,
  since_date date DEFAULT (CURRENT_DATE - INTERVAL '7 days')
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
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id,
    p.user_id,
    pr.username,
    pr.avatar_url,
    p.spotify_track_id,
    p.track_name,
    p.artist_name,
    p.album_name,
    p.album_art_url,
    p.preview_url,
    p.note,
    p.genre,
    p.posted_date,
    p.created_at,
    COUNT(DISTINCT l.user_id) AS like_count,
    COUNT(DISTINCT c.id)      AS comment_count,
    BOOL_OR(l.user_id = requesting_user_id) AS liked_by_me
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN public.likes l    ON l.post_id = p.id
  LEFT JOIN public.comments c ON c.post_id = p.id
  WHERE p.posted_date >= since_date
    AND (
      p.user_id = requesting_user_id
      OR EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = requesting_user_id AND f.following_id = p.user_id
      )
    )
  GROUP BY p.id, pr.username, pr.avatar_url
  ORDER BY p.created_at DESC;
$$;
