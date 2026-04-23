import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "@/components/post-card";
import { BackButton } from "@/components/back-button";
import type { FeedPost } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawPost = Record<string, any>;

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawPost } = await supabase
    .from("posts")
    .select("*, profiles(username, avatar_url), likes(count), comments(count)")
    .eq("id", params.id)
    .single() as { data: RawPost | null };

  if (!rawPost) notFound();

  const { data: myLike } = await supabase
    .from("likes")
    .select("post_id")
    .match({ post_id: params.id, user_id: user.id })
    .maybeSingle();

  const profile = rawPost.profiles as { username: string; avatar_url: string | null };

  const feedPost: FeedPost = {
    id: rawPost.id,
    user_id: rawPost.user_id,
    username: profile.username,
    avatar_url: profile.avatar_url,
    spotify_track_id: rawPost.spotify_track_id,
    track_name: rawPost.track_name,
    artist_name: rawPost.artist_name,
    album_name: rawPost.album_name,
    album_art_url: rawPost.album_art_url ?? null,
    preview_url: rawPost.preview_url ?? null,
    note: rawPost.note ?? null,
    genre: rawPost.genre ?? null,
    posted_date: rawPost.posted_date,
    created_at: rawPost.created_at,
    like_count: rawPost.likes?.[0]?.count ?? 0,
    comment_count: rawPost.comments?.[0]?.count ?? 0,
    liked_by_me: !!myLike,
  };

  return (
    <div className="space-y-4">
      <BackButton />
      <PostCard post={feedPost} currentUserId={user.id} />
    </div>
  );
}
