import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getUserFromBearer } from "@/lib/auth-bearer";

/** Supabase admin client that bypasses RLS — used to delete the auth user. */
function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  let userId: string | null = null;

  if (bearerToken) {
    // Mobile flow: verify JWT locally, no cookie session needed
    userId = getUserFromBearer(bearerToken)?.id ?? null;
  } else {
    // Web flow: SSR cookie session
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // profiles.id -> auth.users(id) ON DELETE CASCADE removes the profile and
  // everything referencing it (posts, comments, likes, follows, notifications,
  // spotify_exports, device_tokens, blocks, reports) in one step.
  const { error } = await adminClient().auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
