import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostCardSkeleton } from "@/components/post-card-skeleton";
import { PostList } from "@/components/post-list";
import { ViewToggle } from "@/components/view-toggle";
import { GenreSearch } from "@/components/genre-search";
import { GENRES } from "@/lib/genres";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { cookies } from "next/headers";
import Link from "next/link";
import type { FeedPost } from "@/types/database";
import { loadDiscoverPosts, loadForYouPosts, loadExplorePosts } from "./actions";
import { NotificationBell } from "@/components/notification-bell";

const TABS = ["all", "foryou", "explore"] as const;
type Tab = (typeof TABS)[number];

async function AllPosts({ userId, genre, view }: { userId: string; genre?: string; view: "compact" | "banner" }) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase.rpc as any)("get_discover", {
    requesting_user_id: userId,
    page_size: 10,
    page_offset: 0,
    genre_filter: genre ?? null,
  });

  if (!posts?.length) {
    return (
      <div className="text-center py-16">
        <p className="font-semibold">No posts yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          {genre ? `No ${genre} posts yet — be the first!` : "Be the first to share a song!"}
        </p>
      </div>
    );
  }

  return (
    <PostList
      initialPosts={posts as FeedPost[]}
      currentUserId={userId}
      variant={view}
      loadMore={loadDiscoverPosts.bind(null, userId, genre)}
    />
  );
}

async function ForYouPosts({ userId, view }: { userId: string; view: "compact" | "banner" }) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase.rpc as any)("get_for_you", {
    requesting_user_id: userId,
    page_size: 10,
    page_offset: 0,
  });

  if (!posts?.length) {
    return (
      <div className="text-center py-16">
        <p className="font-semibold">Nothing here yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Post more songs so we can find music that matches your taste.
        </p>
      </div>
    );
  }

  return (
    <PostList
      initialPosts={posts as FeedPost[]}
      currentUserId={userId}
      variant={view}
      loadMore={loadForYouPosts.bind(null, userId)}
    />
  );
}

async function ExplorePosts({ userId, view }: { userId: string; view: "compact" | "banner" }) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase.rpc as any)("get_explore", {
    requesting_user_id: userId,
    page_size: 10,
    page_offset: 0,
  });

  if (!posts?.length) {
    return (
      <div className="text-center py-16">
        <p className="font-semibold">Nothing new to explore</p>
        <p className="text-sm text-muted-foreground mt-1">
          You&apos;ve covered a lot of ground. Keep posting to unlock more.
        </p>
      </div>
    );
  }

  return (
    <PostList
      initialPosts={posts as FeedPost[]}
      currentUserId={userId}
      variant={view}
      loadMore={loadExplorePosts.bind(null, userId)}
    />
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

  const rawTab = searchParams.tab ?? "all";
  const tab: Tab = (TABS as readonly string[]).includes(rawTab) ? rawTab as Tab : "all";
  const genre = GENRES.includes(searchParams.genre ?? "") ? searchParams.genre : undefined;
  const view: "compact" | "banner" = cookies().get("view")?.value === "compact" ? "compact" : "banner";

  const tabLabels: Record<Tab, string> = { all: "All", foryou: "For You", explore: "Explore" };

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

      {/* Tabs + ViewToggle */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {TABS.map((t) => (
            <Link
              key={t}
              href={`/discover?tab=${t}`}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              )}
            >
              {tabLabels[t]}
            </Link>
          ))}
        </div>
        <ViewToggle current={view} />
      </div>

      {/* Genre search — only on All tab */}
      {tab === "all" && <GenreSearch activeGenre={genre} activeTab={tab} />}

      {/* Content */}
      <Suspense
        key={`${tab}-${genre ?? ""}`}
        fallback={
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <PostCardSkeleton key={i} />)}
          </div>
        }
      >
        {tab === "all"    && <AllPosts    userId={user.id} genre={genre} view={view} />}
        {tab === "foryou" && <ForYouPosts userId={user.id} view={view} />}
        {tab === "explore"&& <ExplorePosts userId={user.id} view={view} />}
      </Suspense>
    </div>
  );
}
