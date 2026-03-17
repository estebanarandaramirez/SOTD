-- ============================================================
-- SOTD – Song of the Day
-- Initial schema: tables, constraints, RLS policies, functions
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text UNIQUE NOT NULL,
  avatar_url  text,
  bio         text,
  created_at  timestamptz DEFAULT now()
);

-- Auto-create a profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Follow graph
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Daily posts (1 per user per day enforced by UNIQUE)
CREATE TABLE IF NOT EXISTS public.posts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  spotify_track_id  text NOT NULL,
  track_name        text NOT NULL,
  artist_name       text NOT NULL,
  album_name        text NOT NULL,
  album_art_url     text,
  preview_url       text,
  note              text,
  posted_date       date NOT NULL DEFAULT CURRENT_DATE,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (user_id, posted_date)
);

-- Likes
CREATE TABLE IF NOT EXISTS public.likes (
  post_id    uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body       text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments  ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_read_all"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Follows
CREATE POLICY "follows_read_all"    ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_own"  ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_own"  ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Posts
CREATE POLICY "posts_read_all"    ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_insert_own"  ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own"  ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete_own"  ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Likes
CREATE POLICY "likes_read_all"   ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "comments_read_all"   ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- RPC: get_feed (friends feed with like counts)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_feed(requesting_user_id uuid, since_date date DEFAULT (CURRENT_DATE - INTERVAL '7 days'))
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
  JOIN public.follows f   ON f.following_id = p.user_id AND f.follower_id = requesting_user_id
  LEFT JOIN public.likes l    ON l.post_id = p.id
  LEFT JOIN public.comments c ON c.post_id = p.id
  WHERE p.posted_date >= since_date
  GROUP BY p.id, pr.username, pr.avatar_url
  ORDER BY p.created_at DESC;
$$;

-- RPC: get_discover (global feed)
CREATE OR REPLACE FUNCTION public.get_discover(requesting_user_id uuid, page_size int DEFAULT 20, page_offset int DEFAULT 0)
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
  GROUP BY p.id, pr.username, pr.avatar_url
  ORDER BY p.created_at DESC
  LIMIT page_size OFFSET page_offset;
$$;
