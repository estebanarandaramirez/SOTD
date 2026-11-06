"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  path: string;
  title?: string;
  text?: string;
  className?: string;
  iconClassName?: string;
}

export function ShareButton({ path, title, text, className, iconClassName }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${path}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User dismissed the native share sheet — not an error.
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button onClick={handleShare} className={className} title="Share">
      {copied ? <Check className={cn(iconClassName, "text-green-500")} /> : <Share2 className={iconClassName} />}
    </button>
  );
}
