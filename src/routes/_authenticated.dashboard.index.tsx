import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useFeasibilitySnapshot } from "@/hooks/use-feasibility";
import { Button } from "@/components/ui/button";
import { Ruler, Wheat, Stethoscope, MapPin, Settings2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard · PoultryFit Kenya" }] }),
  component: DashboardHome,
});

const MODULES = [
  { to: "/dashboard/feasibility" as const, title: "Flock size", desc: "What fits your space and pocket.", icon: Ruler },
  { to: "/dashboard/feed" as const, title: "Feed plan", desc: "Cheapest mix from local agrovets.", icon: Wheat },
  { to: "/dashboard/health" as const, title: "Health check", desc: "A hint, not a diagnosis.", icon: Stethoscope },
  { to: "/dashboard/find" as const, title: "Find help", desc: "Vets and agrovets nearby.", icon: MapPin },
];

function DashboardHome() {
  const { user, profile } = useAuth();
  const { feas } = useFeasibilitySnapshot();

  if (!user || !profile) return null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Karibu, {user.name.split(" ")[0]}.</p>
          <h1 className="font-display text-3xl md:text-4xl">Your flock plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile.county}{profile.ward ? ` · ${profile.ward}` : ""} · {profile.spaceM2} m² · {profile.housing.replace("-", " ")}
            {profile.poultryTypes?.length ? ` · ${profile.poultryTypes.map((t) => t.replace("-", " ")).join(", ")}` : ""}
          </p>
        </div>
        <Link to="/onboarding">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Settings2 className="h-4 w-4" /> Update yard
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Snapshot
          label="Recommended flock"
          value={feas ? `${feas.recommended} birds` : "…"}
          hint={feas ? `limited by ${feas.bindingConstraint}` : ""}
        />
        <Snapshot label="Startup budget" value={`KES ${profile.budgetKes.toLocaleString()}`} hint="from your setup" />
        <Snapshot label="Goal" value={profile.goal} hint={`${profile.experience.replace("-", " ")} keeper`} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {MODULES.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <m.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg">{m.title}</p>
              <p className="text-sm text-muted-foreground">{m.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function Snapshot({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-2xl capitalize">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}