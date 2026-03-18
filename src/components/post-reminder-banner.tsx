"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export function PostReminderBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("post-reminder-dismissed") === "1";
  });

  if (dismissed) return null;

  return (
    <div className="relative rounded-2xl border border-border bg-card p-6 text-center space-y-3">
      <button
        onClick={() => { sessionStorage.setItem("post-reminder-dismissed", "1"); setDismissed(true); }}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss reminder"
      >
        <X className="w-4 h-4" />
      </button>
      <div>
        <p className="font-semibold">You haven&apos;t posted yet today</p>
        <p className="text-sm text-muted-foreground mt-1">What&apos;s the song on your mind right now?</p>
      </div>
      <Link
        href="/post"
        className="inline-block px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Share a song
      </Link>
    </div>
  );
}
