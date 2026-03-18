"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GENRES } from "@/lib/genres";

interface GenreSearchProps {
  activeGenre?: string;
  activeTab: string;
}

export function GenreSearch({ activeGenre, activeTab }: GenreSearchProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filtered = query.trim()
    ? GENRES.filter((g) => g.toLowerCase().includes(query.toLowerCase()))
    : GENRES;

  function selectGenre(g: string) {
    router.push(`/discover?tab=${activeTab}&genre=${encodeURIComponent(g)}`);
  }

  function clearGenre() {
    router.push(`/discover?tab=${activeTab}`);
  }

  return (
    <div className="space-y-2">
      {/* Selected genre badge */}
      {activeGenre && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtering by:</span>
          <span className="flex items-center gap-1 pl-3 pr-2 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {activeGenre}
            <button onClick={clearGenre} className="hover:opacity-70 transition-opacity">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search genres…"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Genre chips — only shown while searching */}
      {query.trim() && (
        <div className="flex flex-wrap gap-2">
          {filtered.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => { selectGenre(g); setQuery(""); }}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeGenre === g
                  ? "bg-primary/20 text-primary ring-1 ring-primary"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              )}
            >
              {g}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No genres match &ldquo;{query}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
}
