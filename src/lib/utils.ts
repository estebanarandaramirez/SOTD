import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Returns today's date as YYYY-MM-DD in Eastern Time (America/New_York). */
export function getEasternDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function parseMentions(text: string): string[] {
  return (text.match(/@(\w+)/g) ?? []).map((m) => m.slice(1));
}

// Returns an array of strings/ReactElements for rendering @mentions as links.
// Import createElement and a Link component at call site.
export function splitMentions(text: string): { type: "text" | "mention"; value: string }[] {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part) => (/^@\w+$/.test(part) ? { type: "mention", value: part.slice(1) } : { type: "text", value: part }));
}

