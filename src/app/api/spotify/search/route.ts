import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/spotify";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
