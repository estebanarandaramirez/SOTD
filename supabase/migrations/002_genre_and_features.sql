-- ============================================================
-- SOTD – Migration 002
-- Add genre to posts, update get_discover, add get_similar_taste
-- ============================================================

-- Add optional genre tag to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS genre text;

-- Update get_discover to accept an optional genre filter
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

-- Find users whose posted artists overlap with the requesting user's taste
CREATE OR REPLACE FUNCTION public.get_similar_taste(
  requesting_user_id uuid,
  result_limit int DEFAULT 8
)
RETURNS TABLE (
  user_id        uuid,
  username       text,
  avatar_url     text,
  shared_artists text[],
  latest_track   text,
  latest_artist  text,
  is_following   boolean
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH my_artists AS (
    SELECT DISTINCT artist_name FROM public.posts WHERE user_id = requesting_user_id
  ),
  matches AS (
    SELECT
      pr.id AS user_id,
      pr.username,
      pr.avatar_url,
      array_agg(DISTINCT p.artist_name ORDER BY p.artist_name) AS shared_artists
    FROM public.posts p
    JOIN public.profiles pr ON pr.id = p.user_id
    WHERE p.user_id != requesting_user_id
      AND p.artist_name IN (SELECT artist_name FROM my_artists)
    GROUP BY pr.id, pr.username, pr.avatar_url
  ),
  latest AS (
    SELECT DISTINCT ON (user_id)
      user_id, track_name, artist_name
    FROM public.posts
    WHERE user_id IN (SELECT user_id FROM matches)
    ORDER BY user_id, posted_date DESC
  )
  SELECT
    m.user_id,
    m.username,
    m.avatar_url,
    m.shared_artists,
    l.track_name  AS latest_track,
    l.artist_name AS latest_artist,
    EXISTS(
      SELECT 1 FROM public.follows
      WHERE follower_id = requesting_user_id AND following_id = m.user_id
    ) AS is_following
  FROM matches m
  LEFT JOIN latest l ON l.user_id = m.user_id
  ORDER BY array_length(m.shared_artists, 1) DESC
  LIMIT result_limit;
$$;
