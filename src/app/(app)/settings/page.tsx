import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import { BackButton } from "@/components/back-button";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, bio, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="sm:hidden">
          <BackButton />
        </div>
        <h1 className="text-xl font-bold">Edit profile</h1>
      </div>

      <SettingsForm
        userId={user.id}
        initialUsername={profile?.username ?? ""}
        initialBio={profile?.bio ?? ""}
        initialAvatarUrl={profile?.avatar_url ?? null}
      />
    </div>
  );
}
