import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { FeasibilityModule } from "@/components/modules/Feasibility";
import { ModuleHeader } from "@/components/ModuleHeader";

export const Route = createFileRoute("/_authenticated/dashboard/feasibility")({
  head: () => ({ meta: [{ title: "Flock size · PoultryFit Kenya" }] }),
  component: Page,
});

function Page() {
  const { profile } = useAuth();
  if (!profile) return null;
  return (
    <div>
      <ModuleHeader title="Flock size" desc="What fits your space and pocket." />
      <FeasibilityModule profile={profile} />
    </div>
  );
}