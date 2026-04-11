import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getArtistById } from "@/lib/spotify";

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

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("id");
  if (!artistId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const artist = await getArtistById(artistId);
  return NextResponse.json({ genres: artist?.genres ?? [] });
}
