import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getArtistById } from "@/lib/spotify";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("id");
  if (!artistId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const artist = await getArtistById(artistId);
  return NextResponse.json({ genres: artist?.genres ?? [] });
}
