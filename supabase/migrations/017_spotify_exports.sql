CREATE TABLE public.spotify_exports (
  user_id         uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  playlist_id     text        NOT NULL,
  access_token    text,
  refresh_token   text        NOT NULL,
  token_expires_at timestamptz,
  enabled         boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spotify_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spotify_exports_self" ON public.spotify_exports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
