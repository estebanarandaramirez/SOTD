import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FollowButton } from "@/components/follow-button";
import { SearchInput } from "@/components/search-input";
import { BackButton } from "@/components/back-button";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const q = searchParams.q?.trim() ?? "";

  let results: {
    id: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    is_following: boolean;
  }[] = [];

  if (q.length >= 3) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio")
      .ilike("username", `%${q}%`)
      .neq("id", user.id)
      .limit(20);

    if (profiles && profiles.length > 0) {
      const ids = profiles.map((p) => p.id);
      const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", ids);

      const followingSet = new Set((following ?? []).map((f) => f.following_id));

      results = profiles.map((p) => ({
        ...p,
        is_following: followingSet.has(p.id),
      }));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-bold">Search</h1>
      </div>

      <SearchInput defaultValue={q} />

      {q.length < 3 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Type at least 3 characters to search</p>
        </div>
      )}

      {q.length >= 3 && results.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-semibold text-foreground">No users found</p>
          <p className="text-sm mt-1">Try a different username</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((profile) => (
            <div key={profile.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
              <Link href={`/profile/${profile.username}`} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.username} width={40} height={40} className="object-cover" />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">
                    {profile.username[0].toUpperCase()}
                  </span>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/profile/${profile.username}`} className="font-semibold text-sm hover:underline">
                  {profile.username}
                </Link>
                {profile.bio && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.bio}</p>
                )}
              </div>

              <FollowButton
                currentUserId={user.id}
                targetUserId={profile.id}
                initialFollowing={profile.is_following}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
