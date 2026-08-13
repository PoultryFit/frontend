import { createFileRoute } from "@tanstack/react-router";
import { HealthTriageModule } from "@/components/modules/HealthTriage";
import { ModuleHeader } from "@/components/ModuleHeader";

export const Route = createFileRoute("/_authenticated/dashboard/health")({
  head: () => ({ meta: [{ title: "Health check · PoultryFit Kenya" }] }),
  component: Page,
});

function Page() {
  return (
    <div>
      <ModuleHeader title="Symptom check" desc="A hint, not a diagnosis." />
      <HealthTriageModule />
    </div>
  );
}