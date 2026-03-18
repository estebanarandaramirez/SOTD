"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Pencil, Check, X, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { timeAgo, splitMentions } from "@/lib/utils";
import { containsProfanity } from "@/lib/moderation";
import { notifyMentions, searchUsersForMention } from "@/app/(app)/actions";

interface Comment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: { username: string; avatar_url: string | null };
}

interface CommentListProps {
  postId: string;
  currentUserId?: string;
  onCommentAdded?: () => void;
}

function CommentBody({ text }: { text: string }) {
  const parts = splitMentions(text);
  return (
    <p className="text-sm mt-0.5 leading-relaxed">
      {parts.map((p, i) =>
        p.type === "mention" ? (
          <Link key={i} href={`/profile/${p.value}`} className="text-primary hover:underline font-medium">
            @{p.value}
          </Link>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </p>
  );
}

export function CommentList({ postId, currentUserId, onCommentAdded }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");

  // Edit/delete state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Mention autocomplete
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<{ username: string }[]>([]);
  const [mentionAnchor, setMentionAnchor] = useState(0); // cursor position of the @ char
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("comments")
      .select("id, user_id, body, created_at, profiles(username, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setComments((data as unknown as Comment[]) ?? []);
        setLoading(false);
      });
  }, [postId]);

  // Mention autocomplete lookup
  useEffect(() => {
    if (mentionQuery === null) { setMentionSuggestions([]); return; }
    searchUsersForMention(mentionQuery).then(setMentionSuggestions);
  }, [mentionQuery]);

  function handleBodyChange(value: string, cursorPos: number) {
    setBody(value);
    setCommentError("");
    // Detect @mention being typed
    const textBeforeCursor = value.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionAnchor(cursorPos - match[0].length);
    } else {
      setMentionQuery(null);
    }
  }

  function insertMention(username: string) {
    const before = body.slice(0, mentionAnchor);
    const after = body.slice(inputRef.current?.selectionEnd ?? mentionAnchor + (mentionQuery?.length ?? 0) + 1);
    const newBody = `${before}@${username} ${after}`;
    setBody(newBody);
    setMentionQuery(null);
    setMentionSuggestions([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

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
      .select("id, user_id, body, created_at, profiles(username, avatar_url)")
      .single();

    if (data) {
      setComments((prev) => [...prev, data as unknown as Comment]);
      onCommentAdded?.();
      // Notify mentioned users
      await notifyMentions(body.trim(), postId, currentUserId);
    }
    setBody("");
    setMentionQuery(null);
    setSubmitting(false);
  }

  async function saveEdit(commentId: string) {
    if (!editBody.trim()) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("comments")
      .update({ body: editBody.trim() })
      .eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, body: editBody.trim() } : c));
    }
    setEditingId(null);
  }

  async function deleteComment(commentId: string) {
    setDeletingId(commentId);
    const supabase = createClient();
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentAdded?.(); // recount
    }
    setDeletingId(null);
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
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <Link href={`/profile/${c.profiles.username}`} className="text-xs font-semibold hover:underline">
                {c.profiles.username}
              </Link>
              <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
              {currentUserId === c.user_id && editingId !== c.id && (
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteComment(c.id)}
                    disabled={deletingId === c.id}
                    className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            {editingId === c.id ? (
              <div className="mt-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value.slice(0, 300))}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(c.id); if (e.key === "Escape") setEditingId(null); }}
                    className="flex-1 text-sm px-2 py-1 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                  <button onClick={() => saveEdit(c.id)} className="text-primary hover:opacity-80"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-xs text-muted-foreground text-right">{editBody.length}/300</p>
              </div>
            ) : (
              <CommentBody text={c.body} />
            )}
          </div>
        </div>
      ))}

      {currentUserId && (
        <div className="pt-1 relative">
          {commentError && <p className="text-xs text-destructive mb-1.5">{commentError}</p>}
          {/* Mention suggestions dropdown */}
          {mentionSuggestions.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 w-48 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
              {mentionSuggestions.map((s) => (
                <button
                  key={s.username}
                  type="button"
                  onClick={() => insertMention(s.username)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  @{s.username}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={submit} className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={body}
                onChange={(e) => handleBodyChange(e.target.value.slice(0, 300), e.target.selectionStart ?? e.target.value.length)}
                placeholder="Add a comment… use @ to mention"
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={!body.trim() || submitting}
                className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {body.length > 0 && (
              <p className="text-xs text-muted-foreground text-right">{body.length}/300</p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
