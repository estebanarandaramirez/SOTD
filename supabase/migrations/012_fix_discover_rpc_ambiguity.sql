-- Fix "column reference user_id is ambiguous" in get_for_you and get_explore.
-- Root cause: subqueries referenced unaliased public.posts/public.likes while the
-- outer query already JOINed those same tables, confusing PostgreSQL's column resolution.

CREATE OR REPLACE FUNCTION public.get_for_you(
  requesting_user_id uuid,
  page_size  int DEFAULT 10,
  page_offset int DEFAULT 0
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
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.user_id,
    pr.username::text, pr.avatar_url::text,
    p.spotify_track_id::text, p.track_name::text, p.artist_name::text,
    p.album_name::text, p.album_art_url::text, p.preview_url::text,
    p.note::text, p.genre::text,
    p.posted_date, p.created_at,
    COUNT(DISTINCT l.user_id)::bigint,
    COUNT(DISTINCT c.id)::bigint,
    EXISTS(SELECT 1 FROM public.likes lk WHERE lk.post_id = p.id AND lk.user_id = requesting_user_id)
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN public.likes l ON l.post_id = p.id
  LEFT JOIN public.comments c ON c.post_id = p.id
  WHERE p.user_id != requesting_user_id
    AND (
      (p.genre IS NOT NULL AND p.genre IN (
        SELECT DISTINCT pp.genre FROM public.posts pp
        WHERE pp.user_id = requesting_user_id AND pp.genre IS NOT NULL
      ))
      OR p.artist_name IN (
        SELECT DISTINCT pp2.artist_name FROM public.posts pp2
        WHERE pp2.user_id = requesting_user_id
      )
    )
  GROUP BY p.id, pr.username, pr.avatar_url
  ORDER BY p.created_at DESC
  LIMIT page_size OFFSET page_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_explore(
  requesting_user_id uuid,
  page_size  int DEFAULT 10,
  page_offset int DEFAULT 0
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
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.user_id,
    pr.username::text, pr.avatar_url::text,
    p.spotify_track_id::text, p.track_name::text, p.artist_name::text,
    p.album_name::text, p.album_art_url::text, p.preview_url::text,
    p.note::text, p.genre::text,
    p.posted_date, p.created_at,
    COUNT(DISTINCT l.user_id)::bigint,
    COUNT(DISTINCT c.id)::bigint,
    EXISTS(SELECT 1 FROM public.likes lk WHERE lk.post_id = p.id AND lk.user_id = requesting_user_id)
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN public.likes l ON l.post_id = p.id
  LEFT JOIN public.comments c ON c.post_id = p.id
  WHERE p.user_id != requesting_user_id
    AND (
      NOT EXISTS(SELECT 1 FROM public.posts pp3 WHERE pp3.user_id = requesting_user_id AND pp3.genre IS NOT NULL)
      OR (
        p.genre IS NOT NULL
        AND p.genre NOT IN (
          SELECT DISTINCT pp4.genre FROM public.posts pp4
          WHERE pp4.user_id = requesting_user_id AND pp4.genre IS NOT NULL
        )
      )
    )
  GROUP BY p.id, pr.username, pr.avatar_url
  ORDER BY p.created_at DESC
  LIMIT page_size OFFSET page_offset;
END;
$$;
