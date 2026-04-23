"use client";

import { useState, useTransition } from "react";
import { Check, Music } from "lucide-react";
import { setSpotifyExportEnabled } from "@/app/(app)/feed/spotify-actions";

type ExportState =
  | { status: "none" }
  | { status: "enabled" }
  | { status: "disabled" };

interface ExportFeedButtonProps {
  exportState: ExportState;
}

export function ExportFeedButton({ exportState }: ExportFeedButtonProps) {
  const [dialog, setDialog] = useState<"connect" | "disable" | "reenable" | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDisable() {
    startTransition(async () => {
      await setSpotifyExportEnabled(false);
      setDialog(null);
    });
  }

  function handleReenable() {
    startTransition(async () => {
      await setSpotifyExportEnabled(true);
      setDialog(null);
    });
  }

  return (
    <>
      {/* Button */}
      {exportState.status === "enabled" ? (
        <button
          onClick={() => setDialog("disable")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-medium hover:bg-green-500/25 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Exported
        </button>
      ) : (
        <button
          onClick={() => setDialog(exportState.status === "disabled" ? "reenable" : "connect")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
        >
          <Music className="w-3.5 h-3.5" />
          Export feed
        </button>
      )}

      {/* Overlay */}
      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDialog(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {dialog === "connect" && (
              <>
                <h2 className="font-bold text-lg">Export feed to Spotify</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This will create a private Spotify playlist called{" "}
                  <span className="font-semibold text-foreground">SOTD</span>. It updates
                  daily with the songs posted to your feed.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If you already have a playlist named{" "}
                  <span className="font-semibold text-foreground">SOTD</span>, a new one
                  will be created — your existing one won&apos;t be touched.
                </p>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setDialog(null)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <a
                    href="/api/spotify/auth"
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium text-center hover:opacity-90 transition-opacity"
                  >
                    Connect Spotify
                  </a>
                </div>
              </>
            )}

            {dialog === "reenable" && (
              <>
                <h2 className="font-bold text-lg">Resume export</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This will resume daily updates to your existing{" "}
                  <span className="font-semibold text-foreground">SOTD</span> playlist on
                  Spotify. It will update again tonight at midnight UTC.
                </p>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setDialog(null)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReenable}
                    disabled={isPending}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isPending ? "Resuming…" : "Resume"}
                  </button>
                </div>
              </>
            )}

            {dialog === "disable" && (
              <>
                <h2 className="font-bold text-lg">Stop exporting?</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your{" "}
                  <span className="font-semibold text-foreground">SOTD</span> playlist will
                  stop updating. It won&apos;t be deleted — you can re-enable at any time or
                  delete it manually from Spotify.
                </p>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setDialog(null)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Keep exporting
                  </button>
                  <button
                    onClick={handleDisable}
                    disabled={isPending}
                    className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isPending ? "Disabling…" : "Stop"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
