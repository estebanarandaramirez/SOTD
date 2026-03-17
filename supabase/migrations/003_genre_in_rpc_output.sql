-- ============================================================
-- SOTD – Migration 003
-- Add genre field to get_feed and get_discover output
-- ============================================================

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
  JOIN public.follows f   ON f.following_id = p.user_id AND f.follower_id = requesting_user_id
  LEFT JOIN public.likes l    ON l.post_id = p.id
  LEFT JOIN public.comments c ON c.post_id = p.id
  WHERE p.posted_date >= since_date
  GROUP BY p.id, pr.username, pr.avatar_url
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_discover(
  requesting_user_id uuid,
  page_size int DEFAULT 20,
  page_offset int DEFAULT 0,
  genre_filter text DEFAULT NULL
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
  WHERE (genre_filter IS NULL OR p.genre = genre_filter)
  GROUP BY p.id, pr.username, pr.avatar_url
  ORDER BY p.created_at DESC
  LIMIT page_size OFFSET page_offset;
$$;
