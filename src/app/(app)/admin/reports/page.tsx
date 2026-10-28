import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

// Single-admin app — no role system needed. This is the lomilitos account's user_id.
const ADMIN_USER_ID = "98b42ac0-5118-4470-aa4a-e49a88e86843";

type Report = {
  id: string;
  reporter_id: string;
  content_type: "post" | "comment" | "user";
  content_id: string;
  reason: string | null;
  status: string;
  created_at: string;
};

type Window = "24h" | "7d" | "all";

function windowStart(window: Window): string | null {
  const now = new Date();
  if (window === "24h") return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  if (window === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return null;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: { window?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_USER_ID) notFound();

  const window: Window = searchParams.window === "24h" || searchParams.window === "7d" ? searchParams.window : "7d";
  const since = windowStart(window);

  // reports is locked to reporter_id = auth.uid() by RLS — the admin needs every
  // row, so this one query uses the service-role client. Everything else below
  // (posts, comments, profiles) is already publicly readable.
  const adminDb = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  let reportsQuery = adminDb.from("reports").select("*").order("created_at", { ascending: false });
  if (since) reportsQuery = reportsQuery.gte("created_at", since);
  const { data: reportsData } = await reportsQuery;
  const reports = (reportsData ?? []) as Report[];

  // Resolve display info for each distinct piece of reported content.
  const postIds = Array.from(new Set(reports.filter((r) => r.content_type === "post").map((r) => r.content_id)));
  const commentIds = Array.from(new Set(reports.filter((r) => r.content_type === "comment").map((r) => r.content_id)));
  const userIds = Array.from(new Set(reports.filter((r) => r.content_type === "user").map((r) => r.content_id)));
  const reporterIds = Array.from(new Set(reports.map((r) => r.reporter_id)));

  const [{ data: posts }, { data: comments }, { data: targetProfiles }, { data: reporterProfiles }] = await Promise.all([
    postIds.length
      ? supabase.from("posts").select("id, track_name, user_id, profiles(username)").in("id", postIds)
      : Promise.resolve({ data: [] }),
    commentIds.length
      ? supabase.from("comments").select("id, body, user_id, profiles(username)").in("id", commentIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase.from("profiles").select("id, username").in("id", userIds)
      : Promise.resolve({ data: [] }),
    reporterIds.length
      ? supabase.from("profiles").select("id, username").in("id", reporterIds)
      : Promise.resolve({ data: [] }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postMap = new Map((posts ?? []).map((p: any) => [p.id, p]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commentMap = new Map((comments ?? []).map((c: any) => [c.id, c]));
  const userMap = new Map((targetProfiles ?? []).map((p) => [p.id, p]));
  const reporterMap = new Map((reporterProfiles ?? []).map((p) => [p.id, p]));

  function describe(r: Report): { label: string; href: string | null } {
    if (r.content_type === "post") {
      const p = postMap.get(r.content_id);
      if (!p) return { label: "(deleted post)", href: null };
      return { label: `"${p.track_name}" by @${p.profiles?.username ?? "?"}`, href: `/post/${r.content_id}` };
    }
    if (r.content_type === "comment") {
      const c = commentMap.get(r.content_id);
      if (!c) return { label: "(deleted comment)", href: null };
      const body = c.body.length > 60 ? c.body.slice(0, 60) + "…" : c.body;
      return { label: `"${body}" by @${c.profiles?.username ?? "?"}`, href: null };
    }
    const p = userMap.get(r.content_id);
    if (!p) return { label: "(deleted user)", href: null };
    return { label: `@${p.username}`, href: `/profile/${p.username}` };
  }

  // Group by content so repeat-reported content surfaces first.
  const groups = new Map<string, Report[]>();
  for (const r of reports) {
    const key = `${r.content_type}:${r.content_id}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  const sortedGroups = Array.from(groups.values()).sort((a, b) => b.length - a.length);

  const tabs: { key: Window; label: string }[] = [
    { key: "24h", label: "Last 24 hours" },
    { key: "7d", label: "Last 7 days" },
    { key: "all", label: "All time" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {reports.length} report{reports.length === 1 ? "" : "s"} · {sortedGroups.length} distinct item{sortedGroups.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/reports?window=${t.key}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              window === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {sortedGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No reports in this window.</p>
      ) : (
        <div className="space-y-3">
          {sortedGroups.map((group) => {
            const { label, href } = describe(group[0]);
            return (
              <div key={`${group[0].content_type}:${group[0].content_id}`} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{group[0].content_type}</span>
                    <p className="font-medium truncate">
                      {href ? (
                        <Link href={href} className="hover:underline">
                          {label}
                        </Link>
                      ) : (
                        label
                      )}
                    </p>
                  </div>
                  <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
                    {group.length} report{group.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {group.map((r) => (
                    <div key={r.id} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>@{reporterMap.get(r.reporter_id)?.username ?? "?"}</span>
                      <span>·</span>
                      <span>{r.reason ?? "No reason given"}</span>
                      <span>·</span>
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
