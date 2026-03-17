"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CalendarPost {
  posted_date: string;
  track_name: string;
  artist_name: string;
}

interface PostingCalendarProps {
  posts: CalendarPost[];
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS = ["", "M", "", "W", "", "F", ""];

function buildWeeks(posts: CalendarPost[]) {
  const postMap = new Map(posts.map((p) => [p.posted_date, p]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Always exactly 15 columns: start on the Sunday 14 weeks ago
  const start = new Date(today);
  start.setDate(start.getDate() - today.getDay()); // rewind to this Sunday
  start.setDate(start.getDate() - 14 * 7);         // go back 14 more weeks

  const weeks: { date: string; post: CalendarPost | null; isFuture: boolean }[][] = [];
  const monthLabels: { label: string; col: number }[] = [];

  let current = new Date(start);
  let col = 0;
  let lastMonth = -1;

  while (col < 15) {
    const week: typeof weeks[0] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().split("T")[0];
      const month = current.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: MONTHS[month], col });
        lastMonth = month;
      }
      week.push({ date: dateStr, post: postMap.get(dateStr) ?? null, isFuture: current > today });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
    col++;
  }

  return { weeks, monthLabels };
}

interface TooltipData {
  date: string;
  post: CalendarPost | null;
  x: number;
  y: number;
}

export function PostingCalendar({ posts }: PostingCalendarProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const { weeks, monthLabels } = buildWeeks(posts);

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Posting history</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>No post</span>
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span>Posted</span>
        </div>
      </div>

      <div className="w-full relative">
        {/* Month labels */}
        <div className="flex gap-1 mb-1 pl-6">
          {weeks.map((_, col) => {
            const label = monthLabels.find((m) => m.col === col);
            return (
              <div key={col} className="flex-1 text-[10px] text-muted-foreground leading-none">
                {label?.label ?? ""}
              </div>
            );
          })}
        </div>

        {/* Day rows */}
        {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
          <div key={dow} className="flex items-center gap-1 mb-1">
            <span className="w-5 text-[10px] text-muted-foreground text-right leading-none flex-shrink-0 pr-1">
              {DAY_LABELS[dow]}
            </span>
            {weeks.map((week, col) => {
              const cell = week[dow];
              return (
                <div
                  key={col}
                  className={cn(
                    "flex-1 h-4 rounded-sm transition-opacity cursor-default",
                    cell.post
                      ? "bg-primary hover:opacity-75"
                      : cell.isFuture
                      ? "bg-muted/30"
                      : "bg-muted hover:opacity-75"
                  )}
                  onMouseEnter={(e) => {
                    if (cell.isFuture) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const parent = e.currentTarget.closest(".relative")!.getBoundingClientRect();
                    setTooltip({
                      date: cell.date,
                      post: cell.post,
                      x: rect.left - parent.left + rect.width / 2,
                      y: rect.top - parent.top,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        ))}

        {/* Floating tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, calc(-100% - 6px))" }}
          >
            <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg whitespace-nowrap">
              <p className="font-medium">{tooltip.date}</p>
              {tooltip.post ? (
                <p className="text-muted-foreground mt-0.5">{tooltip.post.track_name} · {tooltip.post.artist_name}</p>
              ) : (
                <p className="text-muted-foreground mt-0.5">No post</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
