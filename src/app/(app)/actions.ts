"use server";

import { createClient } from "@/lib/supabase/server";
import { parseMentions } from "@/lib/utils";

export async function notifyMentions(body: string, postId: string, actorId: string) {
  const usernames = parseMentions(body);
  if (!usernames.length) return;

  const supabase = createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id")
    .in("username", usernames);

  if (!users?.length) return;

  const targets = users.filter((u) => u.id !== actorId);
  if (!targets.length) return;

  await supabase.from("notifications").insert(
    targets.map((u) => ({
      user_id: u.id,
      actor_id: actorId,
      type: "mention",
      post_id: postId,
    }))
  );
}

export async function searchUsersForMention(prefix: string): Promise<{ username: string }[]> {
  if (!prefix || prefix.length < 1) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .ilike("username", `${prefix}%`)
    .limit(5);
  return (data as { username: string }[]) ?? [];
}
