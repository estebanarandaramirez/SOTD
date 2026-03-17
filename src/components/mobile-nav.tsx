"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, PlusSquare, CheckSquare, User, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  username: string;
  hasPostedToday: boolean;
}

export function MobileNav({ username, hasPostedToday }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border flex">
      <Link
        href="/feed"
        className={cn(
          "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
          pathname === "/feed" ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Home className="w-5 h-5" />
        Feed
      </Link>

      <Link
        href="/discover"
        className={cn(
          "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
          pathname === "/discover" ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Compass className="w-5 h-5" />
        Discover
      </Link>

      {!hasPostedToday && (
        <Link
          href="/post"
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
            pathname === "/post" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <PlusSquare className="w-5 h-5" />
          Post
        </Link>
      )}

      {hasPostedToday && (
        <div className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium text-primary">
          <CheckSquare className="w-5 h-5" />
          Posted!
        </div>
      )}

      <Link
        href="/search"
        className={cn(
          "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
          pathname === "/search" ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Search className="w-5 h-5" />
        Search
      </Link>

<Link
        href={`/profile/${username}`}
        className={cn(
          "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
          pathname.startsWith("/profile") ? "text-primary" : "text-muted-foreground"
        )}
      >
        <User className="w-5 h-5" />
        Profile
      </Link>
    </nav>
  );
}
