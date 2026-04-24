import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ExportRow {
  user_id: string;
  playlist_id: string;
  access_token: string | null;
  refresh_token: string;
  token_expires_at: string | null;
}

interface TokenResult {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

async function refreshSpotifyToken(refreshToken: string): Promise<TokenResult> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

async function getValidToken(row: ExportRow, supabase: ReturnType<typeof createClient>): Promise<string> {
  const needsRefresh =
    !row.access_token ||
    !row.token_expires_at ||
    new Date(row.token_expires_at).getTime() < Date.now() + 60_000;

  if (!needsRefresh) return row.access_token!;

  const refreshed = await refreshSpotifyToken(row.refresh_token);

  await supabase
    .from("spotify_exports")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      token_expires_at: refreshed.expires_at,
    })
    .eq("user_id", row.user_id);

  return refreshed.access_token;
}

async function replacePlaylistTracks(
  playlistId: string,
  trackUris: string[],
  token: string
): Promise<void> {
  // Replace all tracks in one call (Spotify allows up to 100 per request; feeds won't realistically exceed that)
  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: trackUris }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update playlist ${playlistId}: ${res.status} ${body}`);
  }
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

  // Get all enabled exports
  const { data: exports, error } = await supabase
    .from("spotify_exports")
    .select("user_id, playlist_id, access_token, refresh_token, token_expires_at")
    .eq("enabled", true);

  if (error) {
    console.error("Failed to load exports:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results = await Promise.allSettled(
    (exports as ExportRow[]).map(async (row) => {
      // Get today's feed for this user: their own post + posts from who they follow
      const { data: posts } = await supabase.rpc("get_feed", {
        requesting_user_id: row.user_id,
        since_date: today,
        page_size: 200,
        page_offset: 0,
      });

      const trackUris: string[] = (posts ?? [])
        .filter((p: { spotify_track_id: string }) => !!p.spotify_track_id)
        .map((p: { spotify_track_id: string }) => `spotify:track:${p.spotify_track_id}`);

      if (trackUris.length === 0) return { user_id: row.user_id, skipped: true };

      const token = await getValidToken(row, supabase);
      await replacePlaylistTracks(row.playlist_id, trackUris, token);

      return { user_id: row.user_id, tracks: trackUris.length };
    })
  );

  const summary = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { user_id: (exports as ExportRow[])[i].user_id, error: String(r.reason) }
  );

  console.log("export-playlists complete", JSON.stringify(summary));
  return new Response(JSON.stringify({ date: today, results: summary }), {
    headers: { "Content-Type": "application/json" },
  });
});
