import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

/** Supabase admin client that bypasses RLS — used for mobile OAuth writes. */
function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

  // Parse mobile flag and userId embedded in state (format: uuid:userId:mobile)
  const parts = state.split(":");
  const isMobile = parts[2] === "mobile";
  const mobileUserId = isMobile ? parts[1] : null;

  let userId: string;

  if (isMobile && mobileUserId) {
    userId = mobileUserId;
  } else {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${origin}/login`);
    userId = user.id;
  }

  // Exchange code for Spotify tokens
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

  // Get Spotify user to derive their ID for the playlist endpoint
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

  // Mobile: use admin client (no session cookie). Web: SSR client satisfies RLS.
  const db = isMobile ? adminClient() : createClient();
  await db.from("spotify_exports").upsert({
    user_id: userId,
    playlist_id: playlist.id,
    access_token,
    refresh_token,
    token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    enabled: true,
    needs_reauth: false,
  });

  const response = isMobile
    ? NextResponse.redirect(`${origin}/spotify-connected`)
    : NextResponse.redirect(`${origin}/feed?spotify_connected=1`);

  response.cookies.delete("spotify_oauth_state");
  return response;
}
