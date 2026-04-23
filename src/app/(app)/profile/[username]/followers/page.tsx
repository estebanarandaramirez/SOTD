import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FollowButton } from "@/components/follow-button";
import { BackButton } from "@/components/back-button";
import { FollowTabs } from "@/components/follow-tabs";
import Image from "next/image";
import Link from "next/link";

export default async function FollowersPage({ params }: { params: { username: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", params.username)
    .single();

  if (!profile) notFound();

  const { data: follows } = await supabase
    .from("follows")
    .select("profiles!follower_id(id, username, avatar_url, bio)")
    .eq("following_id", profile.id);

  const followers = (follows ?? []).map((f) => f.profiles as unknown as { id: string; username: string; avatar_url: string | null; bio: string | null });

  // Check which ones the current user already follows
  let followingSet = new Set<string>();
  if (user && followers.length > 0) {
    const { data: myFollows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", followers.map((f) => f.id));
    followingSet = new Set((myFollows ?? []).map((f) => f.following_id));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="text-lg font-bold">@{profile.username}</h1>
      </div>
      <FollowTabs username={profile.username} activeTab="followers" />

      {followers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No followers yet.</p>
      ) : (
        <div className="space-y-2">
          {followers.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
              <Link href={`/profile/${f.username}`} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {f.avatar_url ? (
                  <Image src={f.avatar_url} alt={f.username} width={40} height={40} className="object-cover" />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">{f.username[0].toUpperCase()}</span>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${f.username}`} className="font-semibold text-sm hover:underline">
                  {f.username}
                </Link>
                {f.bio && <p className="text-xs text-muted-foreground truncate mt-0.5">{f.bio}</p>}
              </div>
              {user && user.id !== f.id && (
                <FollowButton currentUserId={user.id} targetUserId={f.id} initialFollowing={followingSet.has(f.id)} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
