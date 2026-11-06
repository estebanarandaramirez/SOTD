"use client";

import { useState } from "react";
import { Share2, Flag, Check } from "lucide-react";
import { ReportSheet } from "./report-sheet";

interface PostMenuProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  postId: string;
  canReport: boolean;
  shareTitle: string;
  shareText: string;
}

export function PostMenu({ open, onClose, currentUserId, postId, canReport, shareTitle, shareText }: PostMenuProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/post/${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
      } catch {
        // User dismissed the native share sheet.
      }
      onClose();
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 900);
  }

  if (!open && !reportOpen) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/50 p-0 sm:p-4"
          onClick={onClose}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-card border border-border p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleShare}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl hover:bg-secondary transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
              {copied ? "Link copied" : "Share post"}
            </button>
            {canReport && (
              <button
                onClick={() => {
                  onClose();
                  setReportOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive rounded-xl hover:bg-destructive/10 transition-colors"
              >
                <Flag className="w-4 h-4" />
                Report post
              </button>
            )}
            <button
              onClick={onClose}
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
        contentType="post"
        contentId={postId}
      />
    </>
  );
}
