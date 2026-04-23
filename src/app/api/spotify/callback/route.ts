import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/feed?spotify_error=1`);
  }

  const storedState = request.cookies.get("spotify_oauth_state")?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${origin}/feed?spotify_error=1`);
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  // Exchange code for tokens
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${origin}/api/spotify/callback`,
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/feed?spotify_error=1`);
  }

  const { access_token, refresh_token, expires_in } = await tokenRes.json();

  // Get Spotify user to derive their user ID for the playlist endpoint
  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: "no-store",
  });
  if (!meRes.ok) {
    return NextResponse.redirect(`${origin}/feed?spotify_error=1`);
  }
  const spotifyUser = await meRes.json();

  // Create the SOTD private playlist
  const playlistRes = await fetch(
    `https://api.spotify.com/v1/users/${spotifyUser.id}/playlists`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "SOTD",
        public: false,
        description: "Song of the Day — daily picks from your SOTD feed",
      }),
      cache: "no-store",
    }
  );
  if (!playlistRes.ok) {
    return NextResponse.redirect(`${origin}/feed?spotify_error=1`);
  }
  const playlist = await playlistRes.json();

  // Upsert — handles both first-time connect and reconnect after disabling
  await supabase.from("spotify_exports").upsert({
    user_id: user.id,
    playlist_id: playlist.id,
    access_token,
    refresh_token,
    token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    enabled: true,
  });

  const response = NextResponse.redirect(`${origin}/feed?spotify_connected=1`);
  response.cookies.delete("spotify_oauth_state");
  return response;
}
