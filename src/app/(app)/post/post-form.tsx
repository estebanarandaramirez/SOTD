"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Music, X } from "lucide-react";
import { SpotifySearch } from "@/components/spotify-search";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { SpotifyTrack } from "@/lib/spotify";

const GENRES = [
  "Pop", "Rock", "Hip-Hop", "R&B", "Electronic",
  "Jazz", "Indie", "Classical", "Country", "Metal", "Folk", "Latin",
];

export function PostForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [note, setNote] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handlePost() {
    if (!selectedTrack) return;
    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const albumArt = selectedTrack.album.images[0]?.url ?? null;

    const { error } = await supabase.from("posts").insert({
      user_id: userId,
      spotify_track_id: selectedTrack.id,
      track_name: selectedTrack.name,
      artist_name: selectedTrack.artists.map((a) => a.name).join(", "),
      album_name: selectedTrack.album.name,
      album_art_url: albumArt,
      preview_url: selectedTrack.preview_url,
      note: note.trim() || null,
      genre: genre,
    });

    if (error) {
      const isDuplicate =
        error.message.includes("posts_user_id_posted_date_key") ||
        error.message.includes("duplicate key");
      setError(isDuplicate ? "You've already shared a song today. Come back tomorrow!" : error.message);
      setSubmitting(false);
    } else {
      router.push("/feed");
      router.refresh();
    }
  }

  const albumArt = selectedTrack?.album.images[0]?.url;

  return (
    <div className="space-y-6">
      {!selectedTrack ? (
        <SpotifySearch onSelect={setSelectedTrack} />
      ) : (
        <>
          {/* Selected track preview */}
          <div className="rounded-2xl border border-border overflow-hidden">
            {albumArt && (
              <div className="relative h-40">
                <Image src={albumArt} alt={selectedTrack.album.name} fill className="object-cover opacity-70" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/90" />
              </div>
            )}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {albumArt ? (
                  <Image src={albumArt} alt={selectedTrack.album.name} width={48} height={48} className="rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Music className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedTrack.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedTrack.artists.map((a) => a.name).join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{selectedTrack.album.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrack(null)}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Spotify embed preview */}
          {selectedTrack.preview_url && (
            <iframe
              src={`https://open.spotify.com/embed/track/${selectedTrack.id}?utm_source=generator&theme=0`}
              width="100%"
              height="80"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl border-0"
            />
          )}

          {/* Genre */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Genre <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(genre === g ? null : g)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    genre === g
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Add a note <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Why this song today?"
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className={`text-xs text-right mt-1 ${note.length >= 280 ? "text-destructive" : "text-muted-foreground"}`}>{note.length}/300</p>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            onClick={handlePost}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post song"}
          </button>
        </>
      )}
    </div>
  );
}
