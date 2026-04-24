"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function PostReminderBanner() {
  // null = still checking, true = show, false = hide
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("post-reminder-dismissed") === "1") {
      setShow(false);
      return;
    }

    const localDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setShow(false); return; }
      const { count } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("posted_date", localDate);
      setShow((count ?? 0) === 0);
    });
  }, []);

  if (!show) return null;

  return (
    <div className="relative rounded-2xl border border-border bg-card p-6 text-center space-y-3">
      <button
        onClick={() => {
          sessionStorage.setItem("post-reminder-dismissed", "1");
          setShow(false);
        }}
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
