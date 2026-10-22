"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Flag, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ProfileMenuButtonProps {
  currentUserId: string;
  targetUserId: string;
}

export function ProfileMenuButton({ currentUserId, targetUserId }: ProfileMenuButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);

  async function handleReport() {
    const supabase = createClient();
    await supabase.from("reports").insert({
      reporter_id: currentUserId,
      content_type: "user",
      content_id: targetUserId,
      reason: "Reported from profile",
    });
    setOpen(false);
    setReported(true);
  }

  async function handleBlock() {
    const supabase = createClient();
    await supabase.from("blocks").insert({ blocker_id: currentUserId, blocked_id: targetUserId });
    // Blocking is itself a signal that needs review within 24 hours.
    await supabase.from("reports").insert({
      reporter_id: currentUserId,
      content_type: "user",
      content_id: targetUserId,
      reason: "Blocked user",
    });
    await supabase
      .from("follows")
      .delete()
      .or(
        `and(follower_id.eq.${currentUserId},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${currentUserId})`
      );
    setOpen(false);
    router.push("/feed");
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-1.5 text-muted-foreground hover:text-foreground">
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card border border-border p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleReport}
              disabled={reported}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <Flag className="w-4 h-4" />
              {reported ? "Reported" : "Report user"}
            </button>
            <button
              onClick={handleBlock}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive rounded-xl hover:bg-destructive/10 transition-colors"
            >
              <Ban className="w-4 h-4" />
              Block user
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full px-4 py-3 text-sm text-center text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
