"use server";

import { createClient } from "@/lib/supabase/server";
import type { FeedPost } from "@/types/database";

const PAGE_SIZE = 10;

export async function loadFeedPosts(
  userId: string,
  sinceDate: string,
  offset: number
): Promise<FeedPost[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("get_feed", {
    requesting_user_id: userId,
    since_date: sinceDate,
    page_size: PAGE_SIZE,
    page_offset: offset,
  });
  return (data as FeedPost[]) ?? [];
}
