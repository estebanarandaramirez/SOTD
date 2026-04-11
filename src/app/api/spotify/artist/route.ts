import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getArtistById } from "@/lib/spotify";

async function getUser(request: NextRequest) {
  // Cookie-based auth (web)
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  // Bearer token auth (native app)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user: tokenUser } } = await admin.auth.getUser(token);
    return tokenUser ?? null;
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
