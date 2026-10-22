"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserMinus, MoreVertical, Flag, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ReportSheet } from "./report-sheet";

interface ProfileActionsProps {
  currentUserId: string;
  targetUserId: string;
  initialFollowing: boolean;
  initialBlocked: boolean;
}

export function ProfileActions({
  currentUserId,
  targetUserId,
  initialFollowing,
  initialBlocked,
}: ProfileActionsProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unblockConfirmOpen, setUnblockConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  async function toggleFollow() {
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

  async function handleBlock() {
    const supabase = createClient();
    await supabase.from("blocks").insert({ blocker_id: currentUserId, blocked_id: targetUserId });
    // Blocking is itself a signal that needs review within 24 hours.
    await supabase.from("reports").upsert(
      { reporter_id: currentUserId, content_type: "user", content_id: targetUserId, reason: "Blocked user" },
      { onConflict: "reporter_id,content_type,content_id" }
    );
    await supabase
      .from("follows")
      .delete()
      .or(
        `and(follower_id.eq.${currentUserId},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${currentUserId})`
      );
    setBlocked(true);
    setFollowing(false);
    setMenuOpen(false);
    router.refresh();
  }

  async function handleUnblock() {
    const supabase = createClient();
    await supabase.from("blocks").delete().match({ blocker_id: currentUserId, blocked_id: targetUserId });
    setBlocked(false);
    setUnblockConfirmOpen(false);
    router.refresh();
  }

  if (blocked) {
    return (
      <>
        <button
          onClick={() => setUnblockConfirmOpen(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          Blocked
        </button>

        {unblockConfirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setUnblockConfirmOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-bold text-lg">Unblock this user?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                They&apos;ll be able to see your posts and interact with you again.
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setUnblockConfirmOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnblock}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Unblock
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={toggleFollow}
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

      <button onClick={() => setMenuOpen(true)} className="p-1.5 text-muted-foreground hover:text-foreground">
        <MoreVertical className="w-4 h-4" />
      </button>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card border border-border p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setMenuOpen(false);
                setReportOpen(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl hover:bg-secondary transition-colors"
            >
              <Flag className="w-4 h-4" />
              Report user
            </button>
            <button
              onClick={handleBlock}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive rounded-xl hover:bg-destructive/10 transition-colors"
            >
              <Ban className="w-4 h-4" />
              Block user
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full px-4 py-3 text-sm text-center text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        currentUserId={currentUserId}
        contentType="user"
        contentId={targetUserId}
      />
    </>
  );
}
