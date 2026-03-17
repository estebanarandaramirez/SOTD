"use client";

import { useRouter } from "next/navigation";
import { LayoutList, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  current: "compact" | "banner";
}

export function ViewToggle({ current }: ViewToggleProps) {
  const router = useRouter();

  function setView(view: "compact" | "banner") {
    document.cookie = `view=${view}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted">
      <button
        onClick={() => setView("compact")}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          current === "compact"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="Compact view"
      >
        <LayoutList className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setView("banner")}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          current === "banner"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="Full view"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
