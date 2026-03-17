"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { containsProfanity } from "@/lib/moderation";

interface SettingsFormProps {
  userId: string;
  initialUsername: string;
  initialBio: string;
  initialAvatarUrl: string | null;
}

export function SettingsForm({ userId, initialUsername, initialBio, initialAvatarUrl }: SettingsFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED_TYPES: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    if (!ALLOWED_TYPES[file.type]) {
      setError("Only JPG, PNG, WebP, and GIF images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }

    setUploading(true);
    setError("");

    const supabase = createClient();
    const ext = ALLOWED_TYPES[file.type];
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
    } else {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) {
        setError(updateError.message);
      } else {
        setAvatarUrl(publicUrl);
        router.refresh();
      }
    }
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (bio.trim() && containsProfanity(bio.trim())) {
      setError("Your bio contains inappropriate language.");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ username, bio: bio.trim() || null })
      .eq("id", userId);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Profile updated!");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Avatar */}
      <div>
        <label className="text-sm font-medium block mb-2">Profile picture</label>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">
                {initialUsername[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <label className="cursor-pointer px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2">
            <Camera className="w-4 h-4" />
            {uploading ? "Uploading…" : "Change photo"}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Username */}
      <div>
        <label className="text-sm font-medium block mb-1.5" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
          required
          minLength={3}
          maxLength={30}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="text-sm font-medium block mb-1.5" htmlFor="bio">
          Bio <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Tell people about yourself…"
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground text-right mt-1">{bio.length}/200</p>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}
      {message && (
        <p className="text-sm text-primary bg-primary/10 px-3 py-2 rounded-lg">{message}</p>
      )}

      <button
        type="submit"
        disabled={saving || uploading}
        className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
