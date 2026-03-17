"use client";

import { X } from "lucide-react";
import { CommentList } from "./comment-list";

interface CommentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  currentUserId?: string;
  onCommentAdded?: () => void;
}

export function CommentSheet({ open, onOpenChange, postId, currentUserId, onCommentAdded }: CommentSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative w-full bg-card rounded-t-2xl border border-border flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm">Comments</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <CommentList postId={postId} currentUserId={currentUserId} onCommentAdded={onCommentAdded} />
        </div>
      </div>
    </div>
  );
}
