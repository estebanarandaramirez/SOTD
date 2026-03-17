"use client";

import { useState } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  currentUserId: string;
  targetUserId: string;
  initialFollowing: boolean;
}

export function FollowButton({ currentUserId, targetUserId, initialFollowing }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();

    if (following) {
      setFollowing(false);
      await supabase.from("follows").delete().match({ follower_id: currentUserId, following_id: targetUserId });
    } else {
      setFollowing(true);
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: targetUserId });
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
        following
          ? "bg-muted text-foreground hover:bg-destructive/10 hover:text-destructive"
          : "bg-primary text-primary-foreground hover:opacity-90"
      )}
    >
      {following ? (
        <>
          <UserMinus className="w-3.5 h-3.5" /> Unfollow
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5" /> Follow
        </>
      )}
    </button>
  );
}
