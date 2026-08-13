import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { computeFeedPlan, type SpeciesBreakdown } from "@/lib/poultry-calc";
import { getFeedIngredients, getFeedProducts, type FeedProduct } from "@/lib/feed.functions";
import type { BirdStage, FeedIngredient } from "@/lib/poultry-data";
import { POULTRY_LABEL } from "@/lib/poultry-data";
import type { FarmerProfile, PoultryType } from "@/lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const STAGE_META: Record<BirdStage, { label: string; weeks: string; order: number }> = {
  chick:  { label: "Chick",       weeks: "0–8 wks",  order: 0 },
  grower: { label: "Grower",      weeks: "9–18 wks", order: 1 },
  layer:  { label: "Point-of-lay",weeks: "19+ wks",  order: 2 },
};

export function FeedPlanModule({
  profile,
  bySpecies,
  fallbackBirds = 10,
}: {
  profile: FarmerProfile;
  /** Per-species recommended bird counts from useFeasibilitySnapshot's result. */
  bySpecies: SpeciesBreakdown[] | null;
  /** Used only if bySpecies isn't available yet (still loading). */
  fallbackBirds?: number;
}) {
  const types: PoultryType[] = profile.poultryTypes?.length ? profile.poultryTypes : ["chicken"];
  const birdsFor = (species: PoultryType): number =>
    bySpecies?.find((b) => b.species === species)?.recommended ?? fallbackBirds;

  if (types.length === 1) {
    return <SinglePoultryFeedView profile={profile} birds={birdsFor(types[0])} poultryType={types[0]} />;
  }

  return (
    <Tabs defaultValue={types[0]}>
      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${types.length}, minmax(0, 1fr))` }}>
        {types.map((t) => (
          <TabsTrigger key={t} value={t}>{POULTRY_LABEL[t]}</TabsTrigger>
        ))}
      </TabsList>
      {types.map((t) => (
        <TabsContent key={t} value={t} className="mt-6">
          <SinglePoultryFeedView profile={profile} birds={birdsFor(t)} poultryType={t} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function SinglePoultryFeedView({
  profile,
  birds,
  poultryType,
}: {
  profile: FarmerProfile;
  birds: number;
  poultryType: PoultryType;
}) {
  const fetchIngredients = useServerFn(getFeedIngredients);
  const fetchProducts = useServerFn(getFeedProducts);

  const { data: ingredients, isLoading: ingLoading } = useQuery({
    queryKey: ["feed_ingredients", profile.county],
    queryFn: () => fetchIngredients({ data: { county: profile.county } }),
    staleTime: 5 * 60_000,
  });

  const { data: products, isLoading: prodLoading } = useQuery({
    queryKey: ["feed_products", poultryType, profile.goal, profile.county],
    queryFn: () =>
      fetchProducts({ data: { poultryType, goal: profile.goal, county: profile.county } }),
    staleTime: 5 * 60_000,
  });

  const startOrder = STAGE_META[profile.startingStage].order;
  const trajectoryStages = (Object.keys(STAGE_META) as BirdStage[])
    .filter((s) => STAGE_META[s].order >= startOrder)
    .sort((a, b) => STAGE_META[a].order - STAGE_META[b].order);

  const [stage, setStage] = useState<BirdStage>(profile.startingStage);
  const ingredientList: FeedIngredient[] = ingredients ?? [];

  const plan = useMemo(
    () => computeFeedPlan(stage, Math.max(1, birds), ingredientList, poultryType, profile.county),
    [stage, birds, ingredientList, poultryType, profile.county],
  );

  const trajectory = useMemo(
    () => trajectoryStages.map((s) => ({
      stage: s,
      plan: computeFeedPlan(s, Math.max(1, birds), ingredientList, poultryType, profile.county),
    })),
    [trajectoryStages, birds, ingredientList, poultryType, profile.county],
  );

  const locationLabel = profile.ward?.trim() ? profile.ward.trim() : profile.county;
  const productForStage = (products ?? []).find((p) => p.stage === stage) ?? null;
  const fellBack = (products ?? []).some((p) => p.fallbackFromChicken);

  if (ingLoading || prodLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl bg-muted animate-pulse" />
        <div className="h-40 rounded-2xl bg-muted animate-pulse" />
        <div className="h-48 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  const energyCount = ingredientList.filter((i) => i.energyKcal >= 2500 && i.proteinPct < 20).length;
  const proteinCount = ingredientList.filter((i) => i.proteinPct >= 30).length;
  const enoughIngredients = energyCount >= 2 && proteinCount >= 2 && !!plan;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Feeding plan for</p>
        <p className="mt-1 font-display text-2xl">
          <span className="text-primary">{birds}</span> {POULTRY_LABEL[poultryType].toLowerCase()}
          <span className="text-muted-foreground text-base"> · flock size from your yard</span>
        </p>
      </div>

      {fellBack && (
        <div className="rounded-2xl border border-clay/40 bg-clay/5 p-4 text-sm">
          No dedicated {POULTRY_LABEL[poultryType].toLowerCase()} feeds are stocked yet, showing
          chicken feeds that keepers commonly use as a substitute.
        </div>
      )}

      {trajectoryStages.length > 1 && enoughIngredients && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Cost trajectory</p>
          <p className="mt-1 text-sm text-muted-foreground">Monthly feed cost as your flock grows through each stage.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {trajectory.map((t, i) => {
              const active = t.stage === stage;
              return (
                <button
                  key={t.stage}
                  type="button"
                  onClick={() => setStage(t.stage)}
                  className={cn(
                    "relative rounded-xl border p-4 text-left transition",
                    active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                      )}>{i + 1}</span>
                      <span className="text-sm font-medium">{STAGE_META[t.stage].label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{STAGE_META[t.stage].weeks}</span>
                  </div>
                  {t.plan ? (
                    <>
                      <p className="mt-3 font-display text-xl">KES {t.plan.monthlyCost.toLocaleString()}<span className="text-xs text-muted-foreground font-sans">/mo</span></p>
                      <p className="text-xs text-muted-foreground">{t.plan.dailyKg} kg/day · {t.plan.proteinPct}% protein</p>
                    </>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">No mix available</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {trajectoryStages.length === 1 && (
        <div className="grid grid-cols-1 gap-2">
          {trajectoryStages.map((s) => (
            <button key={s} type="button" onClick={() => setStage(s)}
              className={cn("rounded-lg border px-3 py-2 text-sm capitalize",
                stage === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50")}>
              {STAGE_META[s].label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <RecommendedProductCard product={productForStage} stage={stage} />
        <LeastCostSummaryCard plan={plan} enough={enoughIngredients} locationLabel={locationLabel} stage={stage} />
      </div>

      {enoughIngredients && plan && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-secondary/50 px-5 py-3 text-sm font-medium">
            Least-cost mix for {locationLabel} · KES {plan.costPerKg}/kg · {STAGE_META[stage].label} stage
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Ingredient</th>
                <th className="px-5 py-3 text-right font-medium">Share</th>
                <th className="px-5 py-3 text-right font-medium">kg / day</th>
                <th className="px-5 py-3 text-right font-medium">KES / day</th>
              </tr>
            </thead>
            <tbody>
              {plan.mix.map((row) => (
                <tr key={row.ingredient.id} className="border-t border-border">
                  <td className="px-5 py-3">{row.ingredient.name}</td>
                  <td className="px-5 py-3 text-right">{row.pct}%</td>
                  <td className="px-5 py-3 text-right">{row.kg}</td>
                  <td className="px-5 py-3 text-right">{row.cost.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Prices are indicative Kenyan agrovet rates and refresh as the platform's own pricing API adds partners.
      </p>
    </div>
  );
}

function RecommendedProductCard({ product, stage }: { product: FeedProduct | null; stage: BirdStage }) {
  return (
    <div className="rounded-2xl border border-primary bg-primary/5 p-5">
      <p className="text-xs uppercase tracking-wider text-primary">Recommended commercial feed</p>
      {product ? (
        <>
          <p className="mt-1 font-display text-xl">{product.productName}</p>
          <p className="text-xs text-muted-foreground">
            {product.brand ? `${product.brand} · ` : ""}{product.unitSize} · {STAGE_META[stage].label} stage
          </p>
          <p className="mt-3 font-display text-2xl text-primary">
            KES {product.priceKes.toLocaleString()}
            <span className="text-xs text-muted-foreground font-sans"> / {product.unitSize}</span>
          </p>
          {product.agrovetName && (
            <p className="mt-1 text-xs text-muted-foreground">at {product.agrovetName}</p>
          )}
          {product.notes && <p className="mt-2 text-xs text-muted-foreground">{product.notes}</p>}
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          No commercial {STAGE_META[stage].label.toLowerCase()}-stage product listed yet for this
          goal. Check back soon.
        </p>
      )}
    </div>
  );
}

function LeastCostSummaryCard({
  plan,
  enough,
  locationLabel,
  stage,
}: {
  plan: ReturnType<typeof computeFeedPlan> | null;
  enough: boolean;
  locationLabel: string;
  stage: BirdStage;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Least-cost ingredient mix</p>
      {enough && plan ? (
        <>
          <p className="mt-1 font-display text-xl">Mix your own · {STAGE_META[stage].label}</p>
          <p className="text-xs text-muted-foreground">Cheapest blend from ingredients near {locationLabel}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Monthly</p>
              <p className="font-display text-xl">KES {plan.monthlyCost.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Per kg</p>
              <p className="font-display text-xl">KES {plan.costPerKg}</p>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Not enough ingredient pricing near {locationLabel} to build a least-cost mix yet.
        </p>
      )}
    </div>
  );
}