import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "@/components/DashboardNav";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · PoultryFit Kenya" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user, profile, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h2 className="font-display text-2xl">Sign in to see your plan</h2>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/signup"><Button>Create account</Button></Link>
            <Link to="/signin"><Button variant="outline">Sign in</Button></Link>
          </div>
        </div>
      </div>
    );
  }
  // Load-bearing: prevents a one-frame content flash before _authenticated.tsx's redirect fires. Do not remove without adding null-handling in the layout too.
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-6 pb-24 md:py-8 md:pb-8">
        <DashboardNav />
        <div className="mt-4 md:mt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}