-- App Review rejection (Guideline 1.2 — Safety, User-Generated Content) requires:
-- a mechanism to flag objectionable content and a mechanism to block abusive users,
-- with blocking removing their content from the feed instantly.

CREATE TABLE public.blocks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_select_own" ON public.blocks
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "blocks_insert_own" ON public.blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocks_delete_own" ON public.blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- Reports: flagged content. Only the reporter can insert; nobody reads these back
-- through the client — the developer reviews them directly (service role / SQL)
-- to act within Apple's required 24-hour window.
CREATE TABLE public.reports (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type text        NOT NULL CHECK (content_type IN ('post', 'comment', 'user')),
  content_id   uuid        NOT NULL,
  reason       text,
  status       text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'dismissed')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Feed/discover now exclude posts from either side of a block relationship.
CREATE OR REPLACE FUNCTION public.get_feed(requesting_user_id uuid, since_date date DEFAULT (CURRENT_DATE - '7 days'::interval), page_size integer DEFAULT 10, page_offset integer DEFAULT 0)
RETURNS TABLE(id uuid, user_id uuid, username text, avatar_url text, spotify_track_id text, track_name text, artist_name text, album_name text, album_art_url text, preview_url text, note text, genre text, posted_date date, created_at timestamptz, like_count bigint, comment_count bigint, liked_by_me boolean)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id, p.user_id, pr.username, pr.avatar_url, p.spotify_track_id, p.track_name, p.artist_name,
    p.album_name, p.album_art_url, p.preview_url, p.note, p.genre, p.posted_date, p.created_at,
    COUNT(DISTINCT l.user_id) AS like_count,
    COUNT(DISTINCT c.id) AS comment_count,
    COALESCE(BOOL_OR(l.user_id = requesting_user_id), false) AS liked_by_me
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

CREATE OR REPLACE FUNCTION public.get_discover(requesting_user_id uuid, page_size integer DEFAULT 20, page_offset integer DEFAULT 0, genre_filter text DEFAULT NULL)
RETURNS TABLE(id uuid, user_id uuid, username text, avatar_url text, spotify_track_id text, track_name text, artist_name text, album_name text, album_art_url text, preview_url text, note text, genre text, posted_date date, created_at timestamptz, like_count bigint, comment_count bigint, liked_by_me boolean)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id, p.user_id, pr.username, pr.avatar_url, p.spotify_track_id, p.track_name, p.artist_name,
    p.album_name, p.album_art_url, p.preview_url, p.note, p.genre, p.posted_date, p.created_at,
    COUNT(DISTINCT l.user_id) AS like_count,
    COUNT(DISTINCT c.id) AS comment_count,
    BOOL_OR(l.user_id = requesting_user_id) AS liked_by_me
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
