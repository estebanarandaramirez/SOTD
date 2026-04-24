import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "./post-form";
import { PostCard } from "@/components/post-card";
import { BackButton } from "@/components/back-button";
import type { FeedPost } from "@/types/database";
import { getEasternDate } from "@/lib/utils";

export default async function PostPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existingPost } = await supabase
    .from("posts")
    .select("*, profiles(username, avatar_url)")
    .eq("user_id", user.id)
    .eq("posted_date", getEasternDate())
    .maybeSingle();

  if (existingPost) {
    const profile = existingPost.profiles as { username: string; avatar_url: string | null };
    const feedPost: FeedPost = {
      ...existingPost,
      username: profile.username,
      avatar_url: profile.avatar_url,
      like_count: 0,
      comment_count: 0,
      liked_by_me: false,
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-xl font-bold">Today&apos;s song</h1>
            <p className="text-sm text-muted-foreground mt-1">You&apos;ve already posted today. See you tomorrow!</p>
          </div>
        </div>
        <PostCard post={feedPost} currentUserId={user.id} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-xl font-bold">Post today&apos;s song</h1>
          <p className="text-sm text-muted-foreground mt-1">What are you listening to?</p>
        </div>
      </div>
      <PostForm userId={user.id} />
    </div>
  );
}
