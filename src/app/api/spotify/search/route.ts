import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/spotify";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    const tracks = await searchTracks(q.trim());
    return NextResponse.json({ tracks });
  } catch (err) {
    console.error("Spotify search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
