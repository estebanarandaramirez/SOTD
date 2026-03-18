import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { timeAgo, cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { BackButton } from "@/components/back-button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawNotification = Record<string, any>;

function notificationText(n: RawNotification): { action: string; detail?: string } {
  const track = n.post?.track_name;
  switch (n.type) {
    case "like":    return { action: "liked your post", detail: track };
    case "comment": return { action: "commented on your post", detail: track };
    case "follow":  return { action: "started following you" };
    case "mention": return { action: "mentioned you in a comment", detail: track };
    default:        return { action: "" };
  }
}

export default async function NotificationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch before marking read so we can highlight unread ones
  const { data: raw } = await supabase
    .from("notifications")
    .select("id, type, read, created_at, actor:profiles!actor_id(username, avatar_url), post:posts(id, track_name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Mark all as read
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  const notifications: RawNotification[] = raw ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-semibold">No notifications yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            When someone likes or comments on your posts, you&apos;ll see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => {
            const actor = n.actor as { username: string; avatar_url: string | null } | null;
            const { action, detail } = notificationText(n);
            const href = n.type === "follow"
              ? `/profile/${actor?.username}`
              : `/profile/${actor?.username}`;

            return (
              <Link
                key={n.id}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-muted/50",
                  !n.read && "bg-primary/5"
                )}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {actor?.avatar_url ? (
                    <Image src={actor.avatar_url} alt={actor.username} width={40} height={40} className="object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {actor?.username?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{actor?.username}</span>{" "}
                    <span className="text-muted-foreground">{action}</span>
                    {detail && (
                      <span className="text-foreground font-medium"> · {detail}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

