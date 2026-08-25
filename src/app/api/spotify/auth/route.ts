import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Decode a Supabase Bearer JWT without a network call. */
function getUserFromBearer(token: string): { id: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    );
    if (
      typeof payload.sub !== "string" ||
      typeof payload.exp !== "number" ||
      Date.now() / 1000 > payload.exp ||
      !String(payload.iss ?? "").startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    ) {
      return null;
    }
    return { id: payload.sub };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const accessToken = searchParams.get("access_token");
  const isMobile = searchParams.get("mobile") === "1";

  let userId: string | null = null;

  if (accessToken) {
    // Mobile flow: verify JWT locally, no cookie session needed
    userId = getUserFromBearer(accessToken)?.id ?? null;
  } else {
    // Web flow: SSR cookie session
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) return NextResponse.redirect(`${origin}/login`);

  const uuid = crypto.randomUUID();
  // Mobile state encodes userId so the callback can identify the user without a session
  const state = isMobile ? `${uuid}:${userId}:mobile` : uuid;

  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: `${origin}/api/spotify/callback`,
    scope: "playlist-modify-private playlist-read-private",
    state,
  });

  const response = NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params}`
  );
  response.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
