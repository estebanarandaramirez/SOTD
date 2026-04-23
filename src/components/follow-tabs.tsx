import Link from "next/link";
import { cn } from "@/lib/utils";

interface FollowTabsProps {
  username: string;
  activeTab: "followers" | "following";
}

export function FollowTabs({ username, activeTab }: FollowTabsProps) {
  return (
    <div className="flex border-b border-border">
      <Link
        replace
        href={`/profile/${username}/followers`}
        className={cn(
          "flex-1 py-2.5 text-sm font-medium text-center transition-colors",
          activeTab === "followers"
            ? "text-foreground border-b-2 border-primary -mb-px"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Followers
      </Link>
      <Link
        replace
        href={`/profile/${username}/following`}
        className={cn(
          "flex-1 py-2.5 text-sm font-medium text-center transition-colors",
          activeTab === "following"
            ? "text-foreground border-b-2 border-primary -mb-px"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Following
      </Link>
    </div>
  );
}
