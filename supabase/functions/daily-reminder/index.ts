import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID")!;
const FCM_CLIENT_EMAIL = Deno.env.get("FCM_CLIENT_EMAIL")!;
const FCM_PRIVATE_KEY = (Deno.env.get("FCM_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n");

// ── FCM (shared with send-push) ───────────────────────────────────────────────

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
  const { access_token } = await res.json();
  return access_token;
}

async function sendFCM(token: string): Promise<void> {
  const accessToken = await getFCMAccessToken();
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: "Song of the Day",
            body: "Don't forget to share what you're listening to today!",
          },
          android: { priority: "high" },
          apns: { payload: { aps: { sound: "default" } } },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`FCM ${res.status}: ${await res.text()}`);
}

// ── Handler ───────────────────────────────────────────────────────────────────
// pg_cron fires at both 00:00 UTC and 01:00 UTC (covers EDT and EST).
// Only one will actually be 8PM Eastern — we bail out of the other.

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Guard: only run when it's actually 8PM in Eastern time
  const etHour = parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }).format(new Date()),
    10
  );
  if (etHour !== 20) {
    return new Response(JSON.stringify({ skipped: true, etHour }), { status: 200 });
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: tokens } = await supabase.from("device_tokens").select("user_id, token");
  if (!tokens?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  const userIds = [...new Set(tokens.map((t: { user_id: string }) => t.user_id))];
  const { data: posted } = await supabase
    .from("posts").select("user_id").in("user_id", userIds).eq("posted_date", today);

  const postedSet = new Set((posted ?? []).map((p: { user_id: string }) => p.user_id));
  const unposted = (tokens as { user_id: string; token: string }[]).filter(t => !postedSet.has(t.user_id));

  const results = await Promise.allSettled(unposted.map(t => sendFCM(t.token)));
  const sent = results.filter(r => r.status === "fulfilled").length;

  console.log("daily-reminder", { today, sent, total: unposted.length });
  return new Response(JSON.stringify({ today, sent, total: unposted.length }), { status: 200 });
});
