-- get_for_you: posts matching the requesting user's typical genres or artists
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
    EXISTS(SELECT 1 FROM public.likes WHERE post_id = p.id AND user_id = requesting_user_id)
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
        SELECT DISTINCT pp.artist_name FROM public.posts pp
        WHERE pp.user_id = requesting_user_id
      )
    )
  GROUP BY p.id, pr.username, pr.avatar_url
  ORDER BY p.created_at DESC
  LIMIT page_size OFFSET page_offset;
END;
$$;

-- get_explore: posts with genres the requesting user doesn't typically post
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
    EXISTS(SELECT 1 FROM public.likes WHERE post_id = p.id AND user_id = requesting_user_id)
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN public.likes l ON l.post_id = p.id
  LEFT JOIN public.comments c ON c.post_id = p.id
  WHERE p.user_id != requesting_user_id
    AND (
      -- User has no genre history: show posts with genres (encourages exploration)
      NOT EXISTS(SELECT 1 FROM public.posts WHERE user_id = requesting_user_id AND genre IS NOT NULL)
      OR (
        -- User has genre history: show posts with genres they haven't posted
        p.genre IS NOT NULL
        AND p.genre NOT IN (
          SELECT DISTINCT pp.genre FROM public.posts pp
          WHERE pp.user_id = requesting_user_id AND pp.genre IS NOT NULL
        )
      )
    )
  GROUP BY p.id, pr.username, pr.avatar_url
  ORDER BY p.created_at DESC
  LIMIT page_size OFFSET page_offset;
END;
$$;
