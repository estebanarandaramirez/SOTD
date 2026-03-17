"use server";

import { createClient } from "@/lib/supabase/server";
import type { FeedPost } from "@/types/database";

const PAGE_SIZE = 10;

export async function loadDiscoverPosts(
  userId: string,
  genre: string | undefined,
  offset: number
): Promise<FeedPost[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("get_discover", {
    requesting_user_id: userId,
    page_size: PAGE_SIZE,
    page_offset: offset,
    genre_filter: genre ?? null,
  });
  return (data as FeedPost[]) ?? [];
}
