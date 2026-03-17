import { createClient } from "@/lib/supabase/server";
import { getArtistByName } from "@/lib/spotify";
import { PostCard } from "@/components/post-card";
import { BackButton } from "@/components/back-button";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import type { FeedPost } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawPost = Record<string, any>;

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default async function ArtistPage({ params }: { params: { artistName: string } }) {
  const artistName = decodeURIComponent(params.artistName);
  const view: "compact" | "banner" = cookies().get("view")?.value === "compact" ? "compact" : "banner";

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [spotifyArtist, { data: posts }] = await Promise.all([
    getArtistByName(artistName),
    supabase
      .from("posts")
      .select("*, likes(count), comments(count), profiles!user_id(username, avatar_url)")
      .ilike("artist_name", artistName)
      .order("posted_date", { ascending: false }),
  ]);

  const rawPosts: RawPost[] = posts ?? [];

  // Fetch liked state for current user
  let likedPostIds = new Set<string>();
  if (user && rawPosts.length > 0) {
    const { data: myLikes } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", rawPosts.map((p) => p.id));
    likedPostIds = new Set((myLikes ?? []).map((l) => (l as { post_id: string }).post_id));
  }

  const coverImage = spotifyArtist?.images?.[0]?.url;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton />
      </div>

      {/* Artist hero */}
      <div className="rounded-2xl border border-border overflow-hidden">
        {coverImage && (
          <div className="relative h-48 bg-muted">
            <Image src={coverImage} alt={artistName} fill className="object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/90" />
          </div>
        )}
        <div className={`p-5 ${coverImage ? "-mt-10 relative" : ""}`}>
          <h1 className="text-2xl font-bold">{spotifyArtist?.name ?? artistName}</h1>
          {spotifyArtist && (
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {spotifyArtist.followers?.total > 0 && (
                <span className="text-sm text-muted-foreground">
                  {formatFollowers(spotifyArtist.followers.total)} followers on Spotify
                </span>
              )}
              {spotifyArtist.genres?.slice(0, 3).map((g) => (
                <span key={g} className="px-2.5 py-0.5 rounded-full bg-secondary text-xs font-medium capitalize">
                  {g}
                </span>
              ))}
              <a
                href={spotifyArtist.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto"
              >
                <div className="w-7 h-7 rounded-full bg-[#1DB954] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </div>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Posts on SOTD */}
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          {rawPosts.length === 0
            ? "No one has posted this artist yet."
            : `${rawPosts.length} post${rawPosts.length === 1 ? "" : "s"} on SOTD`}
        </p>

        <div className={view === "banner" ? "space-y-4" : "space-y-2"}>
          {rawPosts.map((post) => {
            const profile = post.profiles as { username: string; avatar_url: string | null } | null;
            const feedPost = {
              ...post,
              username: profile?.username ?? "unknown",
              avatar_url: profile?.avatar_url ?? null,
              like_count: post.likes?.[0]?.count ?? 0,
              comment_count: post.comments?.[0]?.count ?? 0,
              liked_by_me: likedPostIds.has(post.id),
              genre: post.genre ?? null,
            } as FeedPost;
            return <PostCard key={post.id} post={feedPost} currentUserId={user?.id} variant={view} />;
          })}
        </div>
      </div>
    </div>
  );
}
