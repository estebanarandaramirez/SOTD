"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function setSpotifyExportEnabled(enabled: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("spotify_exports")
    .update({ enabled })
    .eq("user_id", user.id);

  revalidatePath("/feed");
}
