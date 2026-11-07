"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface AvatarViewerProps {
  avatarUrl: string | null;
  username: string;
  size: number;
}

export function AvatarViewer({ avatarUrl, username, size }: AvatarViewerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => avatarUrl && setOpen(true)}
        className="rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ width: size, height: size, cursor: avatarUrl ? "pointer" : "default" }}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt={username} width={size} height={size} className="object-cover w-full h-full" />
        ) : (
          <span className="text-3xl font-bold text-muted-foreground">{username[0].toUpperCase()}</span>
        )}
      </button>

      {open && avatarUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-7 h-7" />
          </button>
          <div className="relative w-[min(80vw,480px)] h-[min(80vw,480px)] rounded-full overflow-hidden">
            <Image src={avatarUrl} alt={username} fill className="object-cover" />
          </div>
        </div>
      )}
    </>
  );
}
