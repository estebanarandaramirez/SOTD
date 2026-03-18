"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Music2, Home, Compass, User, Settings, Search, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/feed",     icon: Home,    label: "Feed" },
  { href: "/discover", icon: Compass, label: "Discover" },
  { href: "/search",   icon: Search,  label: "Search" },
  { href: "/profile",  icon: User,    label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface NavSidebarProps {
  username: string;
  hasPostedToday: boolean;
}

export function NavSidebar({ username, hasPostedToday }: NavSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-border bg-background px-4 py-6">
      {/* Logo */}
      <Link href="/feed" className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Music2 className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg">SOTD</span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/profile"
              ? pathname === `/profile/${username}`
              : pathname === href;
          const resolvedHref = href === "/profile" ? `/profile/${username}` : href;

          return (
            <Link
              key={href}
              href={resolvedHref}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Post CTA — hidden once user has posted today */}
      {!hasPostedToday && (
        <Link
          href="/post"
          className="block p-4 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity mb-2"
        >
          <p className="font-bold text-sm">Post today&apos;s song</p>
          <p className="text-xs text-primary-foreground/80 mt-0.5">Share what you&apos;re listening to</p>
        </Link>
      )}

      <button
        onClick={signOut}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
      >
        <LogOut className="w-5 h-5" />
        Log out
      </button>
    </aside>
  );
}
