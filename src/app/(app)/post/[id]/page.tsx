import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "@/components/post-card";
import { BackButton } from "@/components/back-button";
import type { FeedPost } from "@/types/database";

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch post, its profile, like/comment counts, and whether current user liked it in parallel
  const [
    { data: post },
    { count: likeCount },
    { count: commentCount },
    { data: myLike },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("*, profiles!user_id(username, avatar_url)")
      .eq("id", params.id)
      .single(),
    supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", params.id),
    supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", params.id),
    supabase
      .from("likes")
      .select("post_id")
      .match({ post_id: params.id, user_id: user.id })
      .maybeSingle(),
  ]);

  if (!post) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = post as Record<string, any>;
  const profile = raw.profiles as { username: string; avatar_url: string | null };

  const feedPost: FeedPost = {
    id: raw.id,
    user_id: raw.user_id,
    username: profile.username,
    avatar_url: profile.avatar_url,
    spotify_track_id: raw.spotify_track_id,
    track_name: raw.track_name,
    artist_name: raw.artist_name,
    album_name: raw.album_name,
    album_art_url: raw.album_art_url ?? null,
    preview_url: raw.preview_url ?? null,
    note: raw.note ?? null,
    genre: raw.genre ?? null,
    posted_date: raw.posted_date,
    created_at: raw.created_at,
    like_count: likeCount ?? 0,
    comment_count: commentCount ?? 0,
    liked_by_me: !!myLike,
  };

  return (
    <div className="space-y-4">
      <BackButton />
      <PostCard post={feedPost} currentUserId={user.id} />
    </div>
  );
}
