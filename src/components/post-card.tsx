"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Music, Play, Pencil, Check, X } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { containsProfanity } from "@/lib/moderation";
import type { FeedPost } from "@/types/database";
import { CommentSheet } from "./comment-sheet";
import { CommentList } from "./comment-list";

const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

interface PostCardProps {
  post: FeedPost;
  currentUserId?: string;
  variant?: "banner" | "compact";
}

export function PostCard({ post, currentUserId, variant = "banner" }: PostCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [note, setNote] = useState(post.note);
  const [editingNote, setEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState(post.note ?? "");
  const [noteError, setNoteError] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const isOwnPost = currentUserId === post.user_id;

  async function saveNote() {
    const trimmed = noteInput.trim();
    if (trimmed && containsProfanity(trimmed)) {
      setNoteError("Your note contains inappropriate language.");
      return;
    }
    setSavingNote(true);
    setNoteError("");
    const supabase = createClient();
    await supabase.from("posts").update({ note: trimmed || null }).eq("id", post.id);
    setNote(trimmed || null);
    setEditingNote(false);
    setSavingNote(false);
    router.refresh();
  }

  async function toggleLike() {
    if (!currentUserId) return;
    const supabase = createClient();
    if (liked) {
      setLiked(false);
      setLikeCount((n) => n - 1);
      await supabase.from("likes").delete().match({ post_id: post.id, user_id: currentUserId });
    } else {
      setLiked(true);
      setLikeCount((n) => n + 1);
      await supabase.from("likes").insert({ post_id: post.id, user_id: currentUserId });
    }
    router.refresh();
  }

  // ── Compact (horizontal) variant ─────────────────────────────────────────
  if (variant === "compact") {
    return (
      <>
        <article className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex min-h-[88px]">
          {/* Album art – left square, clean (no overlay) */}
          <div className="relative w-32 flex-shrink-0 bg-muted self-stretch">
            {post.album_art_url && (
              <Image src={post.album_art_url} alt="" fill className="object-cover opacity-70" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 px-3 py-3 min-w-0 flex flex-col justify-between">
            {/* Row 1: username + time */}
            <div className="flex items-center gap-1.5 min-w-0">
              <Link href={`/profile/${post.username}`} className="flex items-center gap-1.5 min-w-0 hover:opacity-80">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0">
                  {post.avatar_url ? (
                    <Image src={post.avatar_url} alt="" width={20} height={20} className="object-cover" />
                  ) : (
                    <span className="text-[9px] font-bold text-primary-foreground leading-none">
                      {post.username[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold truncate">{post.username}</span>
              </Link>
              <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                <span className="text-muted-foreground text-xs">{timeAgo(post.created_at)}</span>
                {isOwnPost && !editingNote && (
                  <button
                    onClick={() => { setNoteInput(note ?? ""); setEditingNote(true); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit note"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: track + artist · album */}
            <div className="min-w-0 space-y-0.5">
              <p className="font-semibold text-sm leading-snug truncate">{post.track_name}</p>
              <p className="text-muted-foreground text-xs leading-snug truncate">
                <Link href={`/artist/${encodeURIComponent(post.artist_name)}`} className="hover:underline">{post.artist_name}</Link>
                {" · "}{post.album_name}
              </p>
              {note && !editingNote && (
                <p className="text-xs text-foreground/70 border-l-2 border-primary pl-2 leading-relaxed">{note}</p>
              )}
            </div>

            {/* Row 3: actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleLike}
                disabled={!currentUserId}
                className={cn("flex items-center gap-1 text-xs transition-colors", liked ? "text-red-500" : "text-muted-foreground hover:text-foreground")}
              >
                <Heart className={cn("w-3.5 h-3.5", liked && "fill-current")} />
                <span>{likeCount}</span>
              </button>
              <button
                onClick={() => setShowComments((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{commentCount}</span>
              </button>
              <a
                href={`https://open.spotify.com/track/${post.spotify_track_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto"
              >
                <div className="w-6 h-6 rounded-full bg-[#1DB954] flex items-center justify-center">
                  <SpotifyIcon className="w-3.5 h-3.5 fill-white" />
                </div>
              </a>
            </div>

            {/* Compact inline note editor */}
            {editingNote && (
              <div className="space-y-1.5 pt-1">
                <textarea
                  value={noteInput}
                  onChange={(e) => { setNoteInput(e.target.value); setNoteError(""); }}
                  maxLength={300}
                  rows={2}
                  autoFocus
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                {noteError && <p className="text-xs text-destructive">{noteError}</p>}
                <div className="flex items-center gap-2">
                  <button onClick={saveNote} disabled={savingNote} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button onClick={() => { setEditingNote(false); setNoteInput(note ?? ""); setNoteError(""); }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-xs font-medium hover:bg-muted">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                  <span className={cn("ml-auto text-xs", "text-muted-foreground")}>
                    {noteInput.length}/300
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inline comments – web only */}
        {showComments && (
          <div className="hidden sm:block border-t border-border px-3 py-3">
            <CommentList
              postId={post.id}
              currentUserId={currentUserId}
              onCommentAdded={() => setCommentCount((n) => n + 1)}
            />
          </div>
        )}
        </article>

        {/* Mobile sheet */}
        <div className="sm:hidden">
          <CommentSheet
            open={showComments}
            onOpenChange={setShowComments}
            postId={post.id}
            currentUserId={currentUserId}
            onCommentAdded={() => setCommentCount((n) => n + 1)}
          />
        </div>
      </>
    );
  }

  // ── Banner (vertical) variant ─────────────────────────────────────────────
  return (
    <>
      <article className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Album art banner */}
        <div className="relative h-72 bg-muted">
          {post.album_art_url && (
            <Image src={post.album_art_url} alt={post.album_name} fill className="object-cover opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/90" />

          {/* Genre badge */}
          {post.genre && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
              {post.genre}
            </div>
          )}

          {/* Play button */}
          {post.preview_url && (
            <button
              onClick={() => setShowPlayer((v) => !v)}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg hover:bg-primary transition-colors">
                <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
              </div>
            </button>
          )}
        </div>

        {/* Spotify player */}
        {showPlayer && (
          <iframe
            src={`https://open.spotify.com/embed/track/${post.spotify_track_id}?utm_source=generator&theme=0`}
            width="100%"
            height="80"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="border-0"
          />
        )}

        <div className="p-4 space-y-3">
          {/* User info + time */}
          <div className="flex items-center gap-2">
            <Link href={`/profile/${post.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                {post.avatar_url ? (
                  <Image src={post.avatar_url} alt={post.username} width={28} height={28} className="object-cover" />
                ) : (
                  <span className="text-xs font-bold text-primary-foreground">
                    {post.username[0].toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold">{post.username}</span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-muted-foreground text-xs">{timeAgo(post.created_at)}</span>
              {isOwnPost && !editingNote && (
                <button
                  onClick={() => { setNoteInput(note ?? ""); setEditingNote(true); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit note"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Track info */}
          <div className="min-w-0">
            <p className="font-bold text-base leading-tight truncate">{post.track_name}</p>
            <Link href={`/artist/${encodeURIComponent(post.artist_name)}`} className="text-muted-foreground text-sm mt-0.5 truncate block hover:underline">{post.artist_name}</Link>
            <p className="text-muted-foreground text-xs mt-0.5 truncate">{post.album_name}</p>
          </div>

          {/* Note */}
          {editingNote ? (
            <div className="space-y-1.5">
              <textarea
                value={noteInput}
                onChange={(e) => { setNoteInput(e.target.value); setNoteError(""); }}
                maxLength={300}
                rows={3}
                autoFocus
                className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              {noteError && <p className="text-xs text-destructive">{noteError}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={saveNote}
                  disabled={savingNote}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="w-3 h-3" /> Save
                </button>
                <button
                  onClick={() => { setEditingNote(false); setNoteInput(note ?? ""); setNoteError(""); }}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg border border-border text-xs font-medium hover:bg-muted"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
                <span className={cn("ml-auto text-xs", "text-muted-foreground")}>
                  {noteInput.length}/300
                </span>
              </div>
            </div>
          ) : (
            note && (
              <p className="text-sm text-foreground/80 leading-relaxed border-l-2 border-primary pl-3">
                {note}
              </p>
            )
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={toggleLike}
              disabled={!currentUserId}
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors",
                liked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Heart className={cn("w-4 h-4", liked && "fill-current")} />
              <span>{likeCount}</span>
            </button>

            <button
              onClick={() => setShowComments((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{commentCount}</span>
            </button>

            <a
              href={`https://open.spotify.com/track/${post.spotify_track_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto"
            >
              <div className="w-7 h-7 rounded-full bg-[#1DB954] flex items-center justify-center">
                <SpotifyIcon className="w-4 h-4 fill-white" />
              </div>
            </a>
          </div>
        </div>

        {/* Inline comments – web only */}
        {showComments && (
          <div className="hidden sm:block border-t border-border px-4 py-4">
            <CommentList
              postId={post.id}
              currentUserId={currentUserId}
              onCommentAdded={() => setCommentCount((n) => n + 1)}
            />
          </div>
        )}
      </article>

      {/* Mobile sheet */}
      <div className="sm:hidden">
        <CommentSheet
          open={showComments}
          onOpenChange={setShowComments}
          postId={post.id}
          currentUserId={currentUserId}
          onCommentAdded={() => setCommentCount((n) => n + 1)}
        />
      </div>
    </>
  );
}
