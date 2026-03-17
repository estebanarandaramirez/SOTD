"use client";

import { useState, useRef, useCallback } from "react";
import { Search, Music, Loader2 } from "lucide-react";
import Image from "next/image";
import type { SpotifyTrack } from "@/lib/spotify";

interface SpotifySearchProps {
  onSelect: (track: SpotifyTrack) => void;
}

export function SpotifySearch({ onSelect }: SpotifySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    search(e.target.value);
  }

  function handleSelect(track: SpotifyTrack) {
    setQuery("");
    setResults([]);
    onSelect(track);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search for a song…"
          className="w-full pl-9 pr-4 py-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

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
