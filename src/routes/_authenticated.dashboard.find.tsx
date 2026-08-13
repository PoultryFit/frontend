import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ModuleHeader } from "@/components/ModuleHeader";

const FindHelpModule = lazy(() =>
  import("@/components/modules/FindHelp").then((m) => ({ default: m.FindHelpModule })),
);

export const Route = createFileRoute("/_authenticated/dashboard/find")({
  head: () => ({ meta: [{ title: "Find help · PoultryFit Kenya" }] }),
  component: Page,
});

function Page() {
  const { profile } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!profile) return null;
  return (
    <div>
      <ModuleHeader title="Vets and agrovets" desc="Tap to call." />
      {mounted && (
        <Suspense fallback={<div className="h-[480px] rounded-2xl bg-muted animate-pulse" />}>
          <FindHelpModule county={profile.county} />
        </Suspense>
      )}
    </div>
  );
}