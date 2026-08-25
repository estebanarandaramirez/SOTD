import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID")!;
const FCM_CLIENT_EMAIL = Deno.env.get("FCM_CLIENT_EMAIL")!;
// Private key stored with literal \n — normalize on use
const FCM_PRIVATE_KEY = (Deno.env.get("FCM_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n");

// ── FCM HTTP v1 via service-account JWT ──────────────────────────────────────

function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getFCMAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const message = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({
    iss: FCM_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;

  const pem = FCM_PRIVATE_KEY
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "").trim();
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8", der.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(message));
  const jwt = `${message}.${btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const tokenBody = await res.json();
  if (!tokenBody.access_token) {
    throw new Error(`OAuth2 token exchange failed: ${JSON.stringify(tokenBody)}`);
  }
  return tokenBody.access_token;
}

async function sendFCM(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<void> {
  const accessToken = await getFCMAccessToken();
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data,
          android: { priority: "high" },
          apns: { payload: { aps: { sound: "default" } } },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`FCM ${res.status}: ${await res.text()}`);
}

// ── Notification type → push copy ────────────────────────────────────────────

function buildMessage(type: string, actor: string): { title: string; body: string } {
  switch (type) {
    case "like":            return { title: "New like",       body: `@${actor} liked your song` };
    case "follow":          return { title: "New follower",   body: `@${actor} started following you` };
    case "comment":         return { title: "New comment",    body: `@${actor} commented on your post` };
    case "mention_post":    return { title: "You were mentioned", body: `@${actor} mentioned you in a post` };
    case "mention_comment": return { title: "You were mentioned", body: `@${actor} mentioned you in a comment` };
    case "spotify_reauth":  return { title: "Reconnect Spotify", body: "Spotify signed you out — reconnect to resume your SOTD playlist export." };
    default:                return { title: "Song of the Day", body: `New activity from @${actor}` };
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: { record?: Record<string, string> };
  try { payload = await req.json(); } catch { return new Response("Bad request", { status: 400 }); }

  const notif = payload.record;
  if (!notif?.user_id) return new Response(JSON.stringify({ skipped: "no record" }), { status: 200 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const [tokensRes, actorRes] = await Promise.all([
    supabase.from("device_tokens").select("token").eq("user_id", notif.user_id),
    notif.actor_id
      ? supabase.from("profiles").select("username").eq("id", notif.actor_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const tokens = (tokensRes.data ?? []) as { token: string }[];
  if (tokens.length === 0) return new Response(JSON.stringify({ sent: 0, reason: "no tokens" }), { status: 200 });

  const actor = (actorRes as { data: { username: string } | null }).data?.username ?? "Someone";
  const { title, body } = buildMessage(notif.type, actor);

  const data: Record<string, string> = { type: notif.type, actor_username: actor };
  if (notif.post_id) data.post_id = notif.post_id;

  const results = await Promise.allSettled(
    tokens.map(({ token }) => sendFCM(token, title, body, data))
  );
  const sent = results.filter(r => r.status === "fulfilled").length;
  const errors = results
    .filter(r => r.status === "rejected")
    .map(r => (r as PromiseRejectedResult).reason?.message ?? String(r));
  if (errors.length) console.error("send-push FCM errors", errors);

  console.log("send-push", { type: notif.type, sent, total: tokens.length });
  return new Response(JSON.stringify({ sent, total: tokens.length }), { status: 200 });
});
