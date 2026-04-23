import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "@/components/post-card";
import { BackButton } from "@/components/back-button";
import type { FeedPost } from "@/types/database";

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: post } = await supabase
    .from("posts")
    .select("*, profiles(username, avatar_url), likes(count), comments(count)")
    .eq("id", params.id)
    .single();

  if (!post) notFound();

  const { data: myLike } = await supabase
    .from("likes")
    .select("post_id")
    .match({ post_id: params.id, user_id: user.id })
    .maybeSingle();

  const profile = post.profiles as { username: string; avatar_url: string | null };

  const feedPost: FeedPost = {
    ...post,
    username: profile.username,
    avatar_url: profile.avatar_url,
    like_count: post.likes?.[0]?.count ?? 0,
    comment_count: post.comments?.[0]?.count ?? 0,
    liked_by_me: !!myLike,
    genre: post.genre ?? null,
  };

  return (
    <div className="space-y-4">
      <BackButton />
      <PostCard post={feedPost} currentUserId={user.id} />
    </div>
  );
}
