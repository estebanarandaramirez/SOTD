"use server";

import { createClient } from "@/lib/supabase/server";
import type { FeedPost } from "@/types/database";

const PAGE_SIZE = 10;

export async function loadProfilePosts(
  profileId: string,
  currentUserId: string | null,
  username: string,
  avatarUrl: string | null,
  offset: number
): Promise<FeedPost[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await supabase
    .from("posts")
    .select("*, likes(count), comments(count)")
    .eq("user_id", profileId)
    .order("posted_date", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const rawPosts = (posts ?? []) as Record<string, any>[];

  let likedPostIds = new Set<string>();
  if (currentUserId && rawPosts.length > 0) {
    const { data: myLikes } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", currentUserId)
      .in("post_id", rawPosts.map((p) => p.id));
    likedPostIds = new Set((myLikes ?? []).map((l) => l.post_id));
  }

  return rawPosts.map((post) => ({
    id: post.id,
    user_id: post.user_id,
    username,
    avatar_url: avatarUrl,
    spotify_track_id: post.spotify_track_id,
    track_name: post.track_name,
    artist_name: post.artist_name,
    album_name: post.album_name,
    album_art_url: post.album_art_url ?? null,
    preview_url: post.preview_url ?? null,
    note: post.note ?? null,
    genre: post.genre ?? null,
    posted_date: post.posted_date,
    created_at: post.created_at,
    like_count: post.likes?.[0]?.count ?? 0,
    comment_count: post.comments?.[0]?.count ?? 0,
    liked_by_me: likedPostIds.has(post.id),
  })) as FeedPost[];
}
