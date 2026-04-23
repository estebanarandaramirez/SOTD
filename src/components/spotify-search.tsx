"use client";

import { useState, useRef, useCallback } from "react";
import { Search, Music, Loader2, Link2 } from "lucide-react";
import Image from "next/image";
import type { SpotifyTrack } from "@/lib/spotify";

function parseSpotifyTrackId(text: string): string | null {
  const urlMatch = text.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = text.match(/spotify:track:([A-Za-z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  return null;
}

interface SpotifySearchProps {
  onSelect: (track: SpotifyTrack) => void;
}

export function SpotifySearch({ onSelect }: SpotifySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((q: string) => {
    clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.tracks ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  async function resolveSpotifyUrl(text: string): Promise<boolean> {
    const trackId = parseSpotifyTrackId(text.trim());
    if (!trackId) return false;
    setLoading(true);
    try {
      const res = await fetch(`/api/spotify/track?id=${encodeURIComponent(trackId)}`);
      if (!res.ok) return false;
      const track: SpotifyTrack = await res.json();
      onSelect(track);
      return true;
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    search(e.target.value);
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    const resolved = await resolveSpotifyUrl(text);
    if (resolved) e.preventDefault();
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if leaving the outer container (not a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const text =
      e.dataTransfer.getData("text/plain") ||
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text");
    await resolveSpotifyUrl(text);
  }

  function handleSelect(track: SpotifyTrack) {
    setQuery("");
    setResults([]);
    onSelect(track);
  }

  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`relative rounded-xl transition-all ${isDragging ? "ring-2 ring-primary" : ""}`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <input
          type="text"
          value={isDragging ? "" : query}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder="Search for a song…"
          className="w-full pl-9 pr-4 py-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin z-10" />
        )}

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/10 pointer-events-none">
            <div className="flex items-center gap-2 text-primary">
              <Link2 className="w-4 h-4" />
              <span className="text-sm font-medium">Drop Spotify link</span>
            </div>
          </div>
        )}
      </div>

      {/* Hint text */}
      <p className="text-xs text-muted-foreground mt-1.5 px-1">
        Or paste / drag a Spotify link directly
      </p>

      {results.length > 0 && (
        <ul className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {results.map((track) => {
            const img = track.album.images[2]?.url ?? track.album.images[0]?.url;
            return (
              <li key={track.id}>
                <button
                  onClick={() => handleSelect(track)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-md bg-muted flex-shrink-0 overflow-hidden">
                    {img ? (
                      <Image src={img} alt={track.album.name} width={40} height={40} className="object-cover" />
                    ) : (
                      <Music className="w-4 h-4 m-auto mt-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artists.map((a) => a.name).join(", ")} · {track.album.name}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
