"use client";

import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";
import { containsProfanity } from "@/lib/moderation";
import Link from "next/link";

interface Comment {
  id: string;
  body: string;
  created_at: string;
  profiles: { username: string; avatar_url: string | null };
}

interface CommentListProps {
  postId: string;
  currentUserId?: string;
  onCommentAdded?: () => void;
}

export function CommentList({ postId, currentUserId, onCommentAdded }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("comments")
      .select("id, body, created_at, profiles(username, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setComments((data as unknown as Comment[]) ?? []);
        setLoading(false);
      });
  }, [postId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !currentUserId) return;
    if (containsProfanity(body.trim())) {
      setCommentError("Your comment contains inappropriate language.");
      return;
    }
    setCommentError("");
    setSubmitting(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: currentUserId, body: body.trim() })
      .select("id, body, created_at, profiles(username, avatar_url)")
      .single();

    if (data) {
      setComments((prev) => [...prev, data as unknown as Comment]);
      onCommentAdded?.();
    }
    setBody("");
    setSubmitting(false);
  }

  return (
    <div className="space-y-3">
      {loading && <p className="text-sm text-muted-foreground text-center py-2">Loading…</p>}
      {!loading && comments.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">No comments yet. Be first!</p>
      )}
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2.5">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {c.profiles.avatar_url ? (
              <Image src={c.profiles.avatar_url} alt={c.profiles.username} width={28} height={28} className="object-cover" />
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">
                {c.profiles.username[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <Link href={`/profile/${c.profiles.username}`} className="text-xs font-semibold hover:underline">
                {c.profiles.username}
              </Link>
              <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
            </div>
            <p className="text-sm mt-0.5 leading-relaxed">{c.body}</p>
          </div>
        </div>
      ))}

      {currentUserId && (
        <div className="pt-1">
          {commentError && <p className="text-xs text-destructive mb-1.5">{commentError}</p>}
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              type="text"
              value={body}
              onChange={(e) => { setBody(e.target.value); setCommentError(""); }}
              placeholder="Add a comment…"
              maxLength={500}
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={!body.trim() || submitting}
              className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
