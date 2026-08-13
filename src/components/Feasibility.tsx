import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { computeFeasibility, feedCostPerBirdPerWeek } from "@/lib/poultry-calc";
import { getCountyBylaw, type CountyBylawResult } from "@/lib/bylaws.functions";
import { getFeedIngredients } from "@/lib/feed.functions";
import { saveFeasibilityReport } from "@/lib/reports.functions";
import { generateFeasibilityPdf } from "@/lib/report-pdf";
import { SPACE_PER_BIRD, STARTUP_COST_PER_BIRD, POULTRY_LABEL } from "@/lib/poultry-data";
import { getCurrentUser, type FarmerProfile, type PoultryType } from "@/lib/auth";
import { Ruler, Wallet, Scale, ShieldCheck, ShieldAlert, Save, Check, BookOpen, Globe, Download, Wheat } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function FeasibilityModule({ profile }: { profile: FarmerProfile }) {
  const fetchBylaw = useServerFn(getCountyBylaw);
  const fetchIngredients = useServerFn(getFeedIngredients);
  const saveReport = useServerFn(saveFeasibilityReport);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const { data: bylawResult, isLoading } = useQuery({
    queryKey: ["county_bylaw", profile.county, profile.ward ?? null],
    queryFn: () =>
      fetchBylaw({ data: { county: profile.county, sub_county: profile.ward || undefined } }),
    staleTime: 5 * 60_000,
  });

  const { data: ingredients } = useQuery({
    queryKey: ["feed_ingredients", profile.county],
    queryFn: () => fetchIngredients({ data: { county: profile.county } }),
    staleTime: 5 * 60_000,
  });

  const result = useMemo(() => {
    const speciesList: PoultryType[] = profile.poultryTypes?.length ? profile.poultryTypes : ["chicken"];
    const feedCosts: Partial<Record<PoultryType, number | null>> = {};
    if (ingredients) {
      for (const species of speciesList) {
        feedCosts[species] = feedCostPerBirdPerWeek(profile.startingStage, ingredients, species);
      }
    }
    return computeFeasibility(profile, bylawResult?.countyBylaw ?? null, feedCosts);
  }, [profile, bylawResult, ingredients]);
  const perBird = SPACE_PER_BIRD[profile.housing];

  const handleSave = async () => {
    if (isSaving || justSaved) return;
    setIsSaving(true);
    try {
      await saveReport({
        data: {
          farm_id: null,
          inputs: profile as never,
          results: result as never,
        },
      });
      toast.success("Report saved");
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 4000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save report";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    const user = getCurrentUser();
    try {
      generateFeasibilityPdf({
        farmerName: user?.name ?? "Farmer",
        profile,
        result,
        bylawResult: bylawResult ?? null,
      });
    } catch {
      toast.error("Could not generate the PDF. Try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-40 rounded-2xl bg-muted animate-pulse md:col-span-1" />
        <div className="h-40 rounded-2xl bg-muted animate-pulse md:col-span-2" />
        <div className="h-40 rounded-2xl bg-muted animate-pulse md:col-span-3" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-1 rounded-2xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Recommended flock</p>
        <p className="mt-2 font-display text-6xl text-primary">{result.recommended}</p>
        <p className="mt-2 text-sm text-muted-foreground">birds you can comfortably keep</p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Limited by {result.bindingConstraint}
        </div>
        {result.bySpecies.length > 1 && (
          <div className="mt-4 space-y-1.5 border-t border-border pt-4">
            {result.bySpecies.map((b) => (
              <div key={b.species} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{POULTRY_LABEL[b.species]}</span>
                <span className="font-medium">{b.recommended} birds</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving || justSaved}
          className={cn(
            "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
            justSaved
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60",
          )}
        >
          {isSaving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Saving...
            </>
          ) : justSaved ? (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save this report
            </>
          )}
        </button>
        <button
          onClick={handleDownload}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      <div className="grid gap-3 md:col-span-2">
        <Constraint
          icon={Ruler}
          label="By space"
          value={result.maxBySpace}
          hint={`${profile.lengthM && profile.widthM ? `${profile.lengthM}m x ${profile.widthM}m = ` : ""}${profile.spaceM2} m2 / ${perBird} m2/bird (${profile.housing.replace("-", " ")})`}
          binding={result.bindingConstraint === "space"}
        />
        <Constraint
          icon={Wallet}
          label="By budget"
          value={result.maxByBudget}
          hint={
            result.budget.feedCostPerBirdPerWeek != null
              ? `KES ${profile.budgetKes.toLocaleString()} covers birds + ${result.budget.feedReserveWeeks}wk feed reserve`
              : `KES ${profile.budgetKes.toLocaleString()} / KES ${STARTUP_COST_PER_BIRD[profile.startingStage]}/bird (${stageLabel(profile.startingStage)})`
          }
          binding={result.bindingConstraint === "budget"}
        />
        {result.maxByBylaw !== null && (
          <Constraint
            icon={Scale}
            label={`By ${profile.county} bylaw`}
            value={result.maxByBylaw}
            hint="Advisory maximum for urban backyard keepers"
            binding={result.bindingConstraint === "bylaw"}
          />
        )}
      </div>

      <div className="md:col-span-3">
        <BudgetBreakdownCard profile={profile} result={result} />
      </div>

      <div className="md:col-span-3">
        <BylawCallout county={profile.county} bylawResult={bylawResult ?? null} />
      </div>
    </div>
  );
}

function BudgetBreakdownCard({ profile, result }: { profile: FarmerProfile; result: ReturnType<typeof computeFeasibility> }) {
  const { budget } = result;
  const stageWord = stageLabel(profile.startingStage);
  const tight = budget.feedWeeksCovered !== null && budget.feedWeeksCovered < budget.feedReserveWeeks;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Wheat className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-display text-lg">Your budget, broken down</h3>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Bird stock</p>
          <p className="mt-1 font-display text-xl">{result.recommended} × KES {budget.costPerBird}</p>
          <p className="text-xs text-muted-foreground">= KES {budget.stockCost.toLocaleString()} for {stageWord}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Left for feed</p>
          <p className="mt-1 font-display text-xl">KES {budget.feedBudgetRemaining.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            {budget.feedWeeksCovered !== null
              ? `covers about ${budget.feedWeeksCovered} weeks at current feed prices`
              : "feed price data loading…"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Planning target</p>
          <p className="mt-1 font-display text-xl">{budget.feedReserveWeeks} weeks</p>
          <p className="text-xs text-muted-foreground">minimum feed reserve this plan protects</p>
        </div>
      </div>
      {tight && (
        <p className="mt-4 rounded-lg bg-clay/10 px-3 py-2 text-xs text-clay">
          This budget is tight, feed money runs low before {budget.feedReserveWeeks} weeks. Consider fewer birds or a bigger starting budget.
        </p>
      )}
      <Link to="/dashboard/feed" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        See the full feed plan →
      </Link>
    </div>
  );
}

function BylawCallout({
  county,
  bylawResult,
}: {
  county: string;
  bylawResult: CountyBylawResult | null;
}) {
  const bylaw = bylawResult?.countyBylaw ?? null;
  const nationalRegulations = bylawResult?.nationalRegulations ?? [];
  const hasSummary = bylaw?.bylaw_summary && bylaw.bylaw_summary.trim().length > 0;

  if (hasSummary && bylaw) {
    const warn = bylaw.permit_required;

    const checklist: { label: string; detail: string }[] = [];
    if (bylaw.permit_required) {
      checklist.push({ label: "Get a keeping permit", detail: "Visit your ward or sub-county livestock office before you start." });
    }
    if (bylaw.setback_meters !== null) {
      checklist.push({ label: `Keep ${bylaw.setback_meters}m from your neighbour`, detail: "Minimum coop distance from the property boundary, advised to avoid disputes." });
    }
    if (bylaw.max_birds_residential !== null) {
      checklist.push({ label: `Stay at or under ${bylaw.max_birds_residential} birds`, detail: "Advisory maximum for a residential/urban plot in this county." });
    }
    if (bylaw.notes) {
      checklist.push({ label: "One more thing", detail: bylaw.notes });
    }

    return (
      <div
        className={cn(
          "rounded-2xl border p-5",
          warn ? "border-clay/40 bg-clay/5" : "border-primary/30 bg-primary/5",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-display text-lg">{county} County</h3>
            <span className="text-xs text-muted-foreground">local guidance</span>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              warn ? "bg-clay/15 text-clay" : "bg-primary/15 text-primary",
            )}
          >
            {warn ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {warn ? "Permit required" : "No permit needed"}
          </span>
        </div>

        <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{bylaw.bylaw_summary}</p>

        {checklist.length > 0 && (
          <div className="mt-5 space-y-3 border-t border-border/60 pt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Before you start</p>
            {checklist.map((item, i) => (
              <div key={item.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-medium text-foreground ring-1 ring-border">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {bylaw.source_url && (
          <p className="mt-4 text-xs text-muted-foreground">
            Source: {bylaw.source_url}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-display text-lg">{county} County</h3>
        <span className="text-xs text-muted-foreground">local guidance</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        No specific bylaw has been recorded for {county} County. National regulations apply.
      </p>

      {nationalRegulations.length > 0 && (
        <div className="mt-5 space-y-3 border-t border-border/60 pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Before you start</p>
          {nationalRegulations.map((reg, i) => (
            <div key={reg.id} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-medium text-foreground ring-1 ring-border">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{reg.category ?? "Regulation"}</p>
                {reg.requirement && <p className="text-xs text-muted-foreground">{reg.requirement}</p>}
                <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                  {reg.legal_instrument}{reg.source ? ` · ${reg.source}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Constraint({
  icon: Icon,
  label,
  value,
  hint,
  binding,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint: string;
  binding: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border p-4",
        binding ? "border-primary bg-primary/5" : "border-border bg-card",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          binding ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <p className="font-display text-2xl">{value}</p>
    </div>
  );
}

function stageLabel(s: FarmerProfile["startingStage"]) {
  return s === "chick" ? "day-old chicks" : s === "grower" ? "growers" : "point-of-lay";
}