import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavSidebar } from "@/components/nav-sidebar";
import { MobileNav } from "@/components/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("posted_date", today),
  ]);

  const username = profile?.username ?? "me";
  const hasPostedToday = (count ?? 0) > 0;

  return (
    <div className="flex min-h-screen">
      <NavSidebar username={username} hasPostedToday={hasPostedToday} />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6 w-full">
        {children}
      </main>
      <MobileNav username={username} hasPostedToday={hasPostedToday} />
    </div>
  );
}
