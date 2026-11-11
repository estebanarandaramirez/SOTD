-- Optional image attachment on posts (1) and comments (1).
-- Stored as <user_id>/<random>.<ext> so RLS can scope by folder, unlike the
-- single fixed-name avatar object per user.

alter table public.posts
  add column image_url text;

alter table public.comments
  add column image_url text;

-- A comment can now be image-only; the body-not-empty check only applies
-- when there's no image attached.
alter table public.comments
  drop constraint comments_body_check;
alter table public.comments
  add constraint comments_body_check check (
    (char_length(body) > 0 or image_url is not null) and char_length(body) <= 300
  );

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('comment-images', 'comment-images', true)
on conflict (id) do nothing;

create policy "post_image_read_all" on storage.objects
  for select using (bucket_id = 'post-images');

create policy "post_image_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "post_image_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "comment_image_read_all" on storage.objects
  for select using (bucket_id = 'comment-images');

create policy "comment_image_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comment-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "comment_image_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'comment-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Add image_url to every feed-shaped RPC's output. Postgres won't let
-- CREATE OR REPLACE change a RETURNS TABLE column list even by appending,
-- so each function is dropped (by its exact arg signature) first.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_feed(uuid, date, integer, integer);
CREATE OR REPLACE FUNCTION public.get_feed(requesting_user_id uuid, since_date date DEFAULT (CURRENT_DATE - '7 days'::interval), page_size integer DEFAULT 10, page_offset integer DEFAULT 0)
RETURNS TABLE(id uuid, user_id uuid, username text, avatar_url text, spotify_track_id text, track_name text, artist_name text, album_name text, album_art_url text, preview_url text, note text, genre text, posted_date date, created_at timestamptz, like_count bigint, comment_count bigint, liked_by_me boolean, image_url text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id, p.user_id, pr.username, pr.avatar_url, p.spotify_track_id, p.track_name, p.artist_name,
    p.album_name, p.album_art_url, p.preview_url, p.note, p.genre, p.posted_date, p.created_at,
    COUNT(DISTINCT l.user_id) AS like_count,
    COUNT(DISTINCT c.id) AS comment_count,
    COALESCE(BOOL_OR(l.user_id = requesting_user_id), false) AS liked_by_me,
    p.image_url
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN public.likes l ON l.post_id = p.id
  LEFT JOIN public.comments c ON c.post_id = p.id
  WHERE p.posted_date >= since_date
    AND (
      p.user_id = requesting_user_id
      OR EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = requesting_user_id AND f.following_id = p.user_id)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = requesting_user_id AND b.blocked_id = p.user_id)
         OR (b.blocker_id = p.user_id AND b.blocked_id = requesting_user_id)
    )
  GROUP BY p.id, pr.username, pr.avatar_url
  ORDER BY p.created_at DESC
  LIMIT page_size OFFSET page_offset;
$$;

DROP FUNCTION IF EXISTS public.get_discover(uuid, integer, integer, text);
CREATE OR REPLACE FUNCTION public.get_discover(requesting_user_id uuid, page_size integer DEFAULT 20, page_offset integer DEFAULT 0, genre_filter text DEFAULT NULL)
RETURNS TABLE(id uuid, user_id uuid, username text, avatar_url text, spotify_track_id text, track_name text, artist_name text, album_name text, album_art_url text, preview_url text, note text, genre text, posted_date date, created_at timestamptz, like_count bigint, comment_count bigint, liked_by_me boolean, image_url text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id, p.user_id, pr.username, pr.avatar_url, p.spotify_track_id, p.track_name, p.artist_name,
    p.album_name, p.album_art_url, p.preview_url, p.note, p.genre, p.posted_date, p.created_at,
    COUNT(DISTINCT l.user_id) AS like_count,
    COUNT(DISTINCT c.id) AS comment_count,
    BOOL_OR(l.user_id = requesting_user_id) AS liked_by_me,
    p.image_url
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN public.likes l ON l.post_id = p.id
  LEFT JOIN public.comments c ON c.post_id = p.id
  WHERE (genre_filter IS NULL OR p.genre = genre_filter)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = requesting_user_id AND b.blocked_id = p.user_id)
         OR (b.blocker_id = p.user_id AND b.blocked_id = requesting_user_id)
    )
  GROUP BY p.id, pr.username, pr.avatar_url
  ORDER BY p.created_at DESC
  LIMIT page_size OFFSET page_offset;
$$;

DROP FUNCTION IF EXISTS public.get_for_you(uuid, integer, integer);
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
  liked_by_me      boolean,
  image_url        text
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
    EXISTS(SELECT 1 FROM public.likes lk WHERE lk.post_id = p.id AND lk.user_id = requesting_user_id),
    p.image_url::text
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

DROP FUNCTION IF EXISTS public.get_explore(uuid, integer, integer);
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
  liked_by_me      boolean,
  image_url        text
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
    EXISTS(SELECT 1 FROM public.likes lk WHERE lk.post_id = p.id AND lk.user_id = requesting_user_id),
    p.image_url::text
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

DROP FUNCTION IF EXISTS public.get_profile_posts(uuid, uuid, integer, integer);
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
  liked_by_me      boolean,
  image_url        text
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
    COALESCE(BOOL_OR(l.user_id = requesting_user_id), false)                 AS liked_by_me,
    p.image_url::text
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN public.likes    l ON l.post_id = p.id
  LEFT JOIN public.comments c ON c.post_id = p.id
  WHERE p.user_id = target_user_id
  GROUP BY p.id, pr.username, pr.avatar_url
  ORDER BY p.posted_date DESC
  LIMIT page_size OFFSET page_offset;
$$;
