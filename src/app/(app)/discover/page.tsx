import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostCardSkeleton } from "@/components/post-card-skeleton";
import { PostList } from "@/components/post-list";
import { FollowButton } from "@/components/follow-button";
import { ViewToggle } from "@/components/view-toggle";
import { Suspense } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { cookies } from "next/headers";
import type { FeedPost, SimilarUser } from "@/types/database";
import { loadDiscoverPosts } from "./actions";
import { NotificationBell } from "@/components/notification-bell";

const GENRES = [
  "Pop", "Rock", "Hip-Hop", "R&B", "Electronic",
  "Jazz", "Indie", "Classical", "Country", "Metal", "Folk", "Latin",
];

async function DiscoverPosts({ userId, genre, view }: { userId: string; genre?: string; view: "compact" | "banner" }) {
  const supabase = createClient();
  const { data: posts } = await supabase.rpc("get_discover", {
    requesting_user_id: userId,
    page_size: 10,
    page_offset: 0,
    genre_filter: genre ?? null,
  });

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-semibold">No posts yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          {genre ? `No ${genre} posts yet — be the first!` : "Be the first to share a song!"}
        </p>
      </div>
    );
  }

  const loadMore = loadDiscoverPosts.bind(null, userId, genre);

  return (
    <PostList
      initialPosts={posts as FeedPost[]}
      currentUserId={userId}
      variant={view}
      loadMore={loadMore}
    />
  );
}

async function SimilarTaste({ userId }: { userId: string }) {
  const supabase = createClient();
  const { data: users } = await supabase.rpc("get_similar_taste", {
    requesting_user_id: userId,
    result_limit: 8,
  });

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-semibold">No matches yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Post more songs to find people who share your taste.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(users as SimilarUser[]).map((u) => (
        <div key={u.user_id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
          <Link
            href={`/profile/${u.username}`}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0"
          >
            {u.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-primary-foreground">
                {u.username[0].toUpperCase()}
              </span>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/profile/${u.username}`} className="font-semibold text-sm hover:underline">
              {u.username}
            </Link>
            {u.latest_track && (
              <p className="text-xs text-muted-foreground truncate">
                {u.latest_track} · {u.latest_artist}
              </p>
            )}
            <p className="text-xs text-primary mt-0.5 truncate">
              Shared: {u.shared_artists.slice(0, 3).join(", ")}
              {u.shared_artists.length > 3 ? ` +${u.shared_artists.length - 3} more` : ""}
            </p>
          </div>
          <FollowButton currentUserId={userId} targetUserId={u.user_id} initialFollowing={u.is_following} />
        </div>
      ))}
    </div>
  );
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: { tab?: string; genre?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tab = searchParams.tab === "similar" ? "similar" : "explore";
  const genre = GENRES.includes(searchParams.genre ?? "") ? searchParams.genre : undefined;
  const view: "compact" | "banner" = cookies().get("view")?.value === "compact" ? "compact" : "banner";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Discover</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Explore songs from everyone on SOTD</p>
        </div>
        <NotificationBell variant="icon" />
      </div>

      {/* Filter chips + toggle */}
      <div className="flex items-start gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1">
        <Link
          href="/discover"
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            tab === "explore" && !genre
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          )}
        >
          All
        </Link>
        <Link
          href="/discover?tab=similar"
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            tab === "similar"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          )}
        >
          For You
        </Link>
        {GENRES.map((g) => (
          <Link
            key={g}
            href={`/discover?tab=explore&genre=${encodeURIComponent(g)}`}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              genre === g
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            )}
          >
            {g}
          </Link>
        ))}
        </div>
        <ViewToggle current={view} />
      </div>

      {/* Content */}
      {tab === "similar" ? (
        <Suspense
          fallback={
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          }
        >
          <SimilarTaste userId={user.id} />
        </Suspense>
      ) : (
        <Suspense
          key={genre}
          fallback={
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <PostCardSkeleton key={i} />)}
            </div>
          }
        >
          <DiscoverPosts userId={user.id} genre={genre} view={view} />
        </Suspense>
      )}
    </div>
  );
}
