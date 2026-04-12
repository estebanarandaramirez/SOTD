import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/spotify";
import { createClient } from "@/lib/supabase/server";
import { CORS_HEADERS } from "@/lib/cors";

/** Decode a Supabase Bearer JWT without a network call.
 *  Validates: 3-part structure, not expired, issuer matches our project. */
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
      !String(payload.iss ?? "").startsWith(
        process.env.NEXT_PUBLIC_SUPABASE_URL!
      )
    ) {
      return null;
    }
    return { id: payload.sub };
  } catch {
    return null;
  }
}

async function getUser(request: NextRequest) {
  // Cookie-based auth (web app)
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  // Bearer token auth (native app) — decoded locally, no extra network call
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return getUserFromBearer(authHeader.slice(7));
  }

  return null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ tracks: [] }, { headers: CORS_HEADERS });
  }

  try {
    const tracks = await searchTracks(q.trim());
    return NextResponse.json({ tracks }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("Spotify search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500, headers: CORS_HEADERS });
  }
}
