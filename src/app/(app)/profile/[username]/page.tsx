import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FollowButton } from "@/components/follow-button";
import { PostList } from "@/components/post-list";
import { ViewToggle } from "@/components/view-toggle";
import { PostingCalendar } from "@/components/posting-calendar";
import Image from "next/image";
import Link from "next/link";

import { cookies } from "next/headers";
import type { FeedPost } from "@/types/database";
import { loadProfilePosts } from "../actions";
import { NotificationBell } from "@/components/notification-bell";

interface ProfilePageProps {
  params: { username: string };
}

function calcStreak(posts: { posted_date: string }[]): number {
  if (!posts.length) return 0;
  const sorted = [...posts].sort((a, b) => b.posted_date.localeCompare(a.posted_date));
  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  let expected = today;
  for (const p of sorted) {
    if (p.posted_date === expected) {
      streak++;
      const d = new Date(expected);
      d.setDate(d.getDate() - 1);
      expected = d.toISOString().split("T")[0];
    } else {
      break;
    }
  }
  return streak;
}

function formatPostedDate(dateStr: string): string {
  const today = new Date().toISOString().split("T")[0];
  const date = new Date(dateStr + "T12:00:00");
  const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return dateStr === today ? `Today · ${formatted}` : formatted;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawPost = Record<string, any>;

export default async function ProfilePage({ params }: ProfilePageProps) {
  const view: "compact" | "banner" = cookies().get("view")?.value === "compact" ? "compact" : "banner";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, created_at")
    .eq("username", params.username)
    .single();

  if (!profile) notFound();

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 105); // 15 weeks
  const yearAgoStr = ninetyDaysAgo.toISOString().split("T")[0];

  const [
    { count: followerCount },
    { count: followingCount },
    { count: isFollowingCount },
    { count: totalPostCount },
    { data: posts },
    { data: calendarPosts },
    { data: likeStats },
  ] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
    user
      ? supabase.from("follows").select("*", { count: "exact", head: true }).match({ follower_id: user.id, following_id: profile.id })
      : Promise.resolve({ count: 0 }),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase
      .from("posts")
      .select("*, likes(count), comments(count)")
      .eq("user_id", profile.id)
      .order("posted_date", { ascending: false })
      .range(0, 9),
    supabase
      .from("posts")
      .select("posted_date, track_name, artist_name")
      .eq("user_id", profile.id)
      .gte("posted_date", yearAgoStr),
    supabase.from("posts").select("likes(count)").eq("user_id", profile.id),
  ]);

  const rawPosts: RawPost[] = posts ?? [];

  // Fetch which posts the current user has liked (first page only)
  const postIds = rawPosts.map((p) => p.id);
  let likedPostIds = new Set<string>();
  if (user && postIds.length > 0) {
    const { data: myLikes } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", postIds);
    likedPostIds = new Set((myLikes ?? []).map((l) => l.post_id));
  }

  const likesReceived = (likeStats ?? []).reduce((sum: number, p: RawPost) => sum + (p.likes?.[0]?.count ?? 0), 0);
  const streak = calcStreak(calendarPosts ?? []);

  const isOwnProfile = user?.id === profile.id;
  const isFollowing = (isFollowingCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.username} width={80} height={80} className="object-cover" />
          ) : (
            <span className="text-3xl font-bold text-muted-foreground">
              {profile.username[0].toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">@{profile.username}</h1>
            {isOwnProfile && (
              <Link
                href="/settings"
                className="px-3 py-1 rounded-full border border-border text-xs font-medium hover:bg-muted transition-colors"
              >
                Edit profile
              </Link>
            )}
            {!isOwnProfile && user && (
              <FollowButton
                currentUserId={user.id}
                targetUserId={profile.id}
                initialFollowing={isFollowing}
              />
            )}
            {isOwnProfile && <NotificationBell variant="icon" className="ml-auto" />}
          </div>

          {profile.bio && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{profile.bio}</p>
          )}

          <div className="flex gap-4 mt-2 text-sm">
            <Link href={`/profile/${profile.username}/followers`} className="hover:underline">
              <strong>{followerCount ?? 0}</strong> <span className="text-muted-foreground">{(followerCount ?? 0) === 1 ? "follower" : "followers"}</span>
            </Link>
            <Link href={`/profile/${profile.username}/following`} className="hover:underline">
              <strong>{followingCount ?? 0}</strong> <span className="text-muted-foreground">following</span>
            </Link>
            <span><strong>{totalPostCount ?? 0}</strong> <span className="text-muted-foreground">{(totalPostCount ?? 0) === 1 ? "song" : "songs"}</span></span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold">{totalPostCount ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Days posted</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold">{likesReceived}</p>
          <p className="text-xs text-muted-foreground mt-1">Likes received</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-primary">{streak}</p>
          <p className="text-xs text-muted-foreground mt-1">Day streak</p>
        </div>
      </div>

      {/* Posting calendar */}
      <PostingCalendar posts={calendarPosts ?? []} />

      {/* Song history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Song history</h2>
          <ViewToggle current={view} />
        </div>
        {rawPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No songs posted yet.</p>
          </div>
        ) : (
          <PostList
            initialPosts={rawPosts.map((post) => ({
              ...post,
              username: profile.username,
              avatar_url: profile.avatar_url,
              like_count: post.likes?.[0]?.count ?? 0,
              comment_count: post.comments?.[0]?.count ?? 0,
              liked_by_me: likedPostIds.has(post.id),
              genre: post.genre ?? null,
            } as FeedPost))}
            currentUserId={user?.id}
            variant={view}
            loadMore={loadProfilePosts.bind(null, profile.id, user?.id ?? null, profile.username, profile.avatar_url ?? null)}
          />
        )}
      </div>
    </div>
  );
}
