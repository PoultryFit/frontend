import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, profile, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && user && !profile) navigate({ to: "/onboarding" });
  }, [ready, user, profile, navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <Outlet />;
}
