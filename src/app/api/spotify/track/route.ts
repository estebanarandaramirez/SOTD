import { NextRequest, NextResponse } from "next/server";
import { getTrackById } from "@/lib/spotify";
import { createClient } from "@/lib/supabase/server";
import { CORS_HEADERS } from "@/lib/cors";

function getUserFromBearer(token: string): { id: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (
      typeof payload.sub !== "string" ||
      typeof payload.exp !== "number" ||
      Date.now() / 1000 > payload.exp ||
      !String(payload.iss ?? "").startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    ) return null;
    return { id: payload.sub };
  } catch { return null; }
}

async function getUser(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return getUserFromBearer(authHeader.slice(7));
  return null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400, headers: CORS_HEADERS });

  const track = await getTrackById(id);
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404, headers: CORS_HEADERS });

  return NextResponse.json(track, { headers: CORS_HEADERS });
}
