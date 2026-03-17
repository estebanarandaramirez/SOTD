import Link from "next/link";
import { Music2 } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
            <Music2 className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">SOTD</h1>
            <p className="text-muted-foreground mt-1">Song of the Day</p>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-xl text-muted-foreground leading-relaxed">
          Share <span className="text-foreground font-semibold">one song</span> a day.
          See what your friends are listening to.
        </p>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <Link
            href="/signup"
            className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-center hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="w-full py-3 px-6 rounded-xl border border-border text-foreground font-semibold text-center hover:bg-muted transition-colors"
          >
            Sign in
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          {[
            { emoji: "🎵", label: "1 song/day" },
            { emoji: "👥", label: "Friends feed" },
            { emoji: "🎧", label: "Spotify search" },
          ].map((f) => (
            <div key={f.label} className="text-center">
              <div className="text-2xl">{f.emoji}</div>
              <div className="text-xs text-muted-foreground mt-1">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
