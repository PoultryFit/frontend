import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useFeasibilitySnapshot } from "@/hooks/use-feasibility";
import { FeedPlanModule } from "@/components/modules/FeedPlan";
import { ModuleHeader } from "@/components/ModuleHeader";

export const Route = createFileRoute("/_authenticated/dashboard/feed")({
  head: () => ({ meta: [{ title: "Feed plan · PoultryFit Kenya" }] }),
  component: Page,
});

function Page() {
  const { profile } = useAuth();
  const { feas } = useFeasibilitySnapshot();
  if (!profile) return null;
  return (
    <div>
      <ModuleHeader title="Feed plan" desc="Cheapest mix from local agrovets." />
      <FeedPlanModule profile={profile} bySpecies={feas?.bySpecies ?? null} fallbackBirds={10} />
    </div>
  );
}