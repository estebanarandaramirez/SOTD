import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostCardSkeleton } from "@/components/post-card-skeleton";
import { PostList } from "@/components/post-list";
import { ViewToggle } from "@/components/view-toggle";
import Link from "next/link";
import { Users } from "lucide-react";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { cookies } from "next/headers";
import { loadFeedPosts } from "./actions";
import type { FeedPost } from "@/types/database";
import { NotificationBell } from "@/components/notification-bell";
import { PostReminderBanner } from "@/components/post-reminder-banner";

const FILTERS = [
  { label: "Today",      value: "today" },
  { label: "This week",  value: "week"  },
  { label: "This month", value: "month" },
] as const;

type Filter = "today" | "week" | "month";

function getSinceDate(filter: Filter): string {
  const d = new Date();
  if (filter === "today") {
    return d.toISOString().split("T")[0];
  }
  if (filter === "month") {
    d.setDate(d.getDate() - 29);
  } else {
    d.setDate(d.getDate() - 6);
  }
  return d.toISOString().split("T")[0];
}

async function FeedPosts({
  userId,
  sinceDate,
  view,
}: {
  userId: string;
  sinceDate: string;
  view: "compact" | "banner";
}) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase.rpc as any)("get_feed", {
    requesting_user_id: userId,
    since_date: sinceDate,
    page_size: 10,
    page_offset: 0,
  });

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <Users className="w-12 h-12 text-muted-foreground mx-auto" />
        <div>
          <p className="font-semibold">No songs yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Follow some people or check{" "}
            <Link href="/discover" className="text-primary hover:underline">
              Discover
            </Link>{" "}
            to find new listeners.
          </p>
        </div>
      </div>
    );
  }

  const loadMore = loadFeedPosts.bind(null, userId, sinceDate);

  return (
    <PostList
      initialPosts={posts as FeedPost[]}
      currentUserId={userId}
      variant={view}
      loadMore={loadMore}
    />
  );
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use a 2-day window so users in UTC+ timezones (whose local date is ahead of server UTC)
  // are correctly recognised as having posted today.
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { count } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("posted_date", yesterday.toISOString().split("T")[0]);

  const hasPostedToday = (count ?? 0) > 0;
  const activeFilter: Filter =
    searchParams.filter === "week" ? "week"
    : searchParams.filter === "month" ? "month"
    : "today";

  const sinceDate = getSinceDate(activeFilter);
  const view: "compact" | "banner" = cookies().get("view")?.value === "compact" ? "compact" : "banner";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Friends</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeFilter === "today" ? "Today's picks" : activeFilter === "week" ? "This week's picks" : "This month's picks"} from people you follow
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <NotificationBell variant="icon" />
          {!hasPostedToday && (
            <Link
              href="/post"
              className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + Post today
            </Link>
          )}
        </div>
      </div>

      {/* Time filters + view toggle */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2 flex-1">
          {FILTERS.map(({ label, value }) => (
            <Link
              key={value}
              href={`/feed?filter=${value}`}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeFilter === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        <ViewToggle current={view} />
      </div>

      {/* Banner self-checks via client-side Supabase using device local date */}
      <PostReminderBanner />

      <Suspense
        key={activeFilter}
        fallback={
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <PostCardSkeleton key={i} />)}
          </div>
        }
      >
        <FeedPosts userId={user.id} sinceDate={sinceDate} view={view} />
      </Suspense>
    </div>
  );
}
