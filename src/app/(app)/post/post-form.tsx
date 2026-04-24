"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Music, X } from "lucide-react";
import { SpotifySearch } from "@/components/spotify-search";
import { createClient } from "@/lib/supabase/client";
import { notifyMentions } from "@/app/(app)/actions";
import type { SpotifyTrack } from "@/lib/spotify";

const GENRE_MAP: Record<string, string[]> = {
  "Pop": ["pop", "electropop", "dance pop", "synth-pop", "synth pop"],
  "Rock": ["rock", "alternative rock", "indie rock", "hard rock", "punk", "grunge"],
  "Hip-Hop": ["hip hop", "hip-hop", "rap", "trap", "drill", "grime"],
  "R&B": ["r&b", "soul", "neo soul", "contemporary r&b", "rnb"],
  "Electronic": ["electronic", "edm", "house", "techno", "dubstep", "ambient", "drum and bass"],
  "Jazz": ["jazz", "jazz fusion", "smooth jazz", "bebop"],
  "Indie": ["indie", "indie pop", "indie folk", "bedroom pop", "lo-fi", "lo fi"],
  "Classical": ["classical", "orchestral", "opera", "baroque", "chamber"],
  "Country": ["country", "country pop", "bluegrass", "americana"],
  "Metal": ["metal", "heavy metal", "death metal", "black metal", "metalcore"],
  "Folk": ["folk", "folk rock", "traditional folk", "singer-songwriter"],
  "Latin": ["latin", "reggaeton", "salsa", "bachata", "latin pop", "cumbia"],
};

function mapSpotifyGenre(genres: string[]): string | null {
  for (const genre of genres) {
    const lower = genre.toLowerCase();
    for (const [mapped, keywords] of Object.entries(GENRE_MAP)) {
      if (keywords.some((k) => lower.includes(k))) return mapped;
    }
  }
  return null;
}

export function PostForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [note, setNote] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [genreLoading, setGenreLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedTrack) { setGenre(null); return; }
    const artistId = selectedTrack.artists[0]?.id;
    if (!artistId) return;
    setGenreLoading(true);
    fetch(`/api/spotify/artist?id=${artistId}`)
      .then((r) => r.json())
      .then(({ genres }) => { setGenre(mapSpotifyGenre(genres ?? [])); })
      .finally(() => setGenreLoading(false));
  }, [selectedTrack]);

  async function handlePost() {
    if (!selectedTrack) return;
    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const albumArt = selectedTrack.album.images[0]?.url ?? null;
    const posted_date = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

    const { data: newPost, error } = await supabase.from("posts").insert({
      user_id: userId,
      spotify_track_id: selectedTrack.id,
      track_name: selectedTrack.name,
      artist_name: selectedTrack.artists.map((a) => a.name).join(", "),
      artist_id: selectedTrack.artists[0]?.id ?? null,
      album_name: selectedTrack.album.name,
      album_art_url: albumArt,
      preview_url: selectedTrack.preview_url,
      note: note.trim() || null,
      genre: genre,
      posted_date,
    }).select("id").single();

    if (error) {
      const isDuplicate =
        error.message.includes("posts_user_id_posted_date_key") ||
        error.message.includes("duplicate key");
      setError(isDuplicate ? "You've already shared a song today. Come back tomorrow!" : error.message);
      setSubmitting(false);
    } else {
      // Notify anyone @mentioned in the note
      if (newPost && note.trim()) {
        await notifyMentions(note.trim(), newPost.id, userId);
      }
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

          {/* Genre — auto-detected from Spotify */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Genre</span>
            {genreLoading && <span className="text-muted-foreground text-xs">Detecting…</span>}
            {!genreLoading && genre && (
              <span className="px-2.5 py-0.5 rounded-full bg-secondary text-xs font-medium">{genre}</span>
            )}
            {!genreLoading && !genre && (
              <span className="text-muted-foreground text-xs">Not detected</span>
            )}
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
            <p className="text-xs text-right mt-1 text-muted-foreground">{note.length}/300</p>
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
