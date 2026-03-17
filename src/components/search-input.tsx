"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function SearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value.trim();
    router.push(q.length >= 3 ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        defaultValue={defaultValue}
        onChange={handleChange}
        placeholder="Search users…"
        autoFocus
        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
