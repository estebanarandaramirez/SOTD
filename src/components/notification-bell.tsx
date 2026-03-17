"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface NotificationBellProps {
  variant: "sidebar" | "mobile" | "icon";
  className?: string;
}

export function NotificationBell({ variant, className }: NotificationBellProps) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const isActive = pathname === "/notifications";

  useEffect(() => {
    const supabase = createClient();

    async function fetchCount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnread(count ?? 0);
    }

    fetchCount();
    // Reset badge when navigating to notifications page
    if (pathname === "/notifications") setUnread(0);
  }, [pathname]);

  const badge = unread > 0 && (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
      {unread > 9 ? "9+" : unread}
    </span>
  );

  if (variant === "icon") {
    return (
      <Link href="/notifications" className={cn("relative p-1 text-muted-foreground hover:text-foreground transition-colors", className)}>
        <Bell className="w-5 h-5" />
        {badge}
      </Link>
    );
  }

  if (variant === "sidebar") {
    return (
      <Link
        href="/notifications"
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <div className="relative">
          <Bell className="w-5 h-5" />
          {badge}
        </div>
        Notifications
      </Link>
    );
  }

  return (
    <Link
      href="/notifications"
      className={cn(
        "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      <div className="relative">
        <Bell className="w-5 h-5" />
        {badge}
      </div>
      Activity
    </Link>
  );
}
