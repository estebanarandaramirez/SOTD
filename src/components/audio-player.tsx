"use client";

import { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  duration?: number | null;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, duration }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play();
  }

  const progress = totalDuration ? Math.min(currentTime / totalDuration, 1) : 0;

  return (
    <div className="flex items-center gap-2 bg-muted border border-border rounded-full px-3 py-2 max-w-[200px]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onLoadedMetadata={(e) => setTotalDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        className="hidden"
      />
      <button
        type="button"
        onClick={toggle}
        className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground"
      >
        {playing ? <Pause className="w-3 h-3" fill="currentColor" /> : <Play className="w-3 h-3 ml-0.5" fill="currentColor" />}
      </button>
      <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
        {formatTime(currentTime > 0 ? currentTime : totalDuration)}
      </span>
    </div>
  );
}
