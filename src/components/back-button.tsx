"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => href ? router.push(href) : router.back()}
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
