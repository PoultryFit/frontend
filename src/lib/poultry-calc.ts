import {
  SPACE_PER_BIRD, STARTUP_COST_PER_BIRD,
  STAGE_TARGET, SYMPTOMS, CONDITIONS,
  SPECIES_SPACE_MULTIPLIER, SPECIES_STARTUP_COST_PER_BIRD, SPECIES_STAGE_TARGET,
  type BirdStage, type FeedIngredient,
} from "./poultry-data";
import type { FarmerProfile, PoultryType } from "./auth";
import type { CountyBylawRow } from "./bylaws.functions";

// --- Feasibility -----------------------------------------------------------

// How many weeks of feed the budget should reserve on top of buying the
// birds themselves. A farmer who spends everything on stock and has zero
// left for feed runs into trouble in week one — this keeps that honest.
const FEED_RESERVE_WEEKS = 4;

export interface SpeciesBreakdown {
  species: PoultryType;
  ratio: number; // normalized 0-1 share of space/budget this species gets
  spaceAllocated: number; // m² allocated to this species
  budgetAllocated: number; // KES allocated to this species
  maxBySpace: number;
  maxByBudget: number;
  recommended: number; // min(maxBySpace, maxByBudget), before any bylaw-cap scaling
  costPerBird: number;
  feedCostPerBirdPerWeek: number | null;
}

export interface BudgetBreakdown {
  costPerBird: number; // blended average across species (stockCost / recommended)
  feedCostPerBirdPerWeek: number | null; // blended; null if any selected species lacks feed data
  feedReserveWeeks: number;
  stockCost: number;
  feedBudgetRemaining: number;
  feedWeeksCovered: number | null;
}

export interface FeasibilityResult {
  maxBySpace: number;
  maxByBudget: number;
  maxByBylaw: number | null;
  recommended: number;
  bindingConstraint: "space" | "budget" | "bylaw";
  notes: string[];
  budget: BudgetBreakdown;
  bySpecies: SpeciesBreakdown[];
}

/**
 * Splits the farmer's space and budget across every poultry type they
 * selected, using their speciesRatio priority weights (even split if unset),
 * then sizes each species independently since a turkey needs more space and
 * costs more per bird than a chicken or a quail. County bylaw caps apply to
 * the combined flock total, not per species, so that cap scales every
 * species down proportionally if the combined total exceeds it.
 *
 * For a single-species profile this produces identical numbers to the old
 * single-species-only version, ratio is 1.0, so nothing changes for the
 * common case.
 *
 * @param feedCostPerBirdPerWeekBySpecies Real feed cost for one bird of each
 * species at the farmer's starting stage, for one week, from live
 * feed_ingredients/feed_prices data (see feedCostPerBirdPerWeek() below).
 * A missing/null entry for a species falls back to bird-stock cost only for
 * that species' budget constraint.
 */
export function computeFeasibility(
  p: FarmerProfile,
  bylaw: CountyBylawRow | null,
  feedCostPerBirdPerWeekBySpecies: Partial<Record<PoultryType, number | null>> = {},
): FeasibilityResult {
  const speciesList: PoultryType[] = p.poultryTypes?.length ? p.poultryTypes : ["chicken"];
  const weights = speciesList.map((s) => Math.max(0, p.speciesRatio?.[s] ?? 1) || 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0) || speciesList.length;
  const ratios = weights.map((w) => w / totalWeight);

  const baseSpacePerBird = SPACE_PER_BIRD[p.housing] ?? 0.5;

  const bySpecies: SpeciesBreakdown[] = speciesList.map((species, i) => {
    const ratio = ratios[i];
    const spaceAllocated = p.spaceM2 * ratio;
    const budgetAllocated = p.budgetKes * ratio;

    const spaceMultiplier = SPECIES_SPACE_MULTIPLIER[species] ?? 1;
    const speciesSpacePerBird = baseSpacePerBird * spaceMultiplier;
    const maxBySpace = Math.max(0, Math.floor(spaceAllocated / speciesSpacePerBird));

    const costPerBird =
      SPECIES_STARTUP_COST_PER_BIRD[species]?.[p.startingStage] ?? STARTUP_COST_PER_BIRD[p.startingStage];
    const feedCostPerBirdPerWeek = feedCostPerBirdPerWeekBySpecies[species] ?? null;
    const feedReservePerBird = feedCostPerBirdPerWeek != null ? feedCostPerBirdPerWeek * FEED_RESERVE_WEEKS : 0;
    const totalCostPerBird = costPerBird + feedReservePerBird;
    const maxByBudget = Math.max(0, Math.floor(budgetAllocated / totalCostPerBird));

    return {
      species,
      ratio,
      spaceAllocated: Math.round(spaceAllocated * 10) / 10,
      budgetAllocated: Math.round(budgetAllocated),
      maxBySpace,
      maxByBudget,
      recommended: Math.min(maxBySpace, maxByBudget),
      costPerBird,
      feedCostPerBirdPerWeek,
    };
  });

  const maxBySpace = bySpecies.reduce((a, b) => a + b.maxBySpace, 0);
  const maxByBudget = bySpecies.reduce((a, b) => a + b.maxByBudget, 0);
  const preBylawTotal = bySpecies.reduce((a, b) => a + b.recommended, 0);
  const maxByBylaw = bylaw?.max_birds_residential ?? null;

  let scaledBySpecies = bySpecies;
  let bindingConstraint: FeasibilityResult["bindingConstraint"] = maxBySpace <= maxByBudget ? "space" : "budget";

  if (maxByBylaw !== null && preBylawTotal > maxByBylaw) {
    bindingConstraint = "bylaw";
    const scale = preBylawTotal > 0 ? maxByBylaw / preBylawTotal : 0;
    scaledBySpecies = bySpecies.map((b) => ({ ...b, recommended: Math.floor(b.recommended * scale) }));
  }

  const recommended = scaledBySpecies.reduce((a, b) => a + b.recommended, 0);

  const notes: string[] = [];
  if (bylaw?.permit_required) notes.push(`${p.county} County typically requires a livestock permit — check with your ward office.`);
  if (bylaw?.setback_meters) notes.push(`Keep the coop at least ${bylaw.setback_meters}m from the nearest neighbour to avoid disputes.`);
  if (bylaw?.notes) notes.push(bylaw.notes);

  const stockCost = Math.round(scaledBySpecies.reduce((sum, b) => sum + b.recommended * b.costPerBird, 0));
  const feedBudgetRemaining = Math.max(0, p.budgetKes - stockCost);
  const anyFeedDataMissing = scaledBySpecies.some((b) => b.recommended > 0 && b.feedCostPerBirdPerWeek == null);
  const flockWeeklyFeedCost = scaledBySpecies.reduce(
    (sum, b) => sum + (b.feedCostPerBirdPerWeek != null ? b.feedCostPerBirdPerWeek * b.recommended : 0),
    0,
  );
  const feedWeeksCovered =
    !anyFeedDataMissing && flockWeeklyFeedCost > 0
      ? Math.round((feedBudgetRemaining / flockWeeklyFeedCost) * 10) / 10
      : null;

  return {
    maxBySpace,
    maxByBudget,
    maxByBylaw,
    recommended,
    bindingConstraint,
    notes,
    budget: {
      costPerBird: recommended > 0 ? Math.round(stockCost / recommended) : (scaledBySpecies[0]?.costPerBird ?? 0),
      feedCostPerBirdPerWeek: anyFeedDataMissing ? null : flockWeeklyFeedCost / Math.max(1, recommended),
      feedReserveWeeks: FEED_RESERVE_WEEKS,
      stockCost,
      feedBudgetRemaining,
      feedWeeksCovered,
    },
    bySpecies: scaledBySpecies,
  };
}

// --- Feed plan -------------------------------------------------------------

export interface FeedPlan {
  stage: BirdStage;
  species: PoultryType;
  birds: number;
  mix: { ingredient: FeedIngredient; kg: number; pct: number; cost: number }[];
  proteinPct: number;
  costPerKg: number;
  dailyKg: number;
  dailyCost: number;
  monthlyCost: number;
}

/**
 * Very simple least-cost heuristic: cheapest feasible 2- or 3-ingredient mix
 * that hits the stage's target protein for the given species. Not a full
 * linear program, but honest for an early-decision planner. Real API can
 * swap in a proper LP later.
 */
export function computeFeedPlan(
  stage: BirdStage,
  birds: number,
  ingredients: FeedIngredient[],
  species: PoultryType = "chicken",
  _county?: string,
): FeedPlan | null {
  // county is accepted for future regional pricing; unused today.
  void _county;
  const target = SPECIES_STAGE_TARGET[species]?.[stage] ?? STAGE_TARGET[stage];
  // Build candidate two-ingredient mixes across (energy source, protein source, filler).
  const energySources = ingredients.filter((i) => i.energyKcal >= 2500 && i.proteinPct < 20);
  const proteinSources = ingredients.filter((i) => i.proteinPct >= 30);
  const lime = ingredients.find((i) => i.id === "lime");
  if (!lime || energySources.length < 2 || proteinSources.length < 2) return null;

  let best: FeedPlan | null = null;

  for (const e of energySources) {
    for (const pr of proteinSources) {
      // Solve x*e.protein + (1-x-limePct)*pr.protein = target.protein, limePct=5%
      const limePct = stage === "layer" ? 0.06 : 0.02;
      // let x = share of energy source, y = 1 - x - limePct = share of protein source
      // e.protein * x + pr.protein * (1 - x - limePct) = target
      const P = target.protein;
      const denom = pr.proteinPct - e.proteinPct;
      if (denom === 0) continue;
      const x = (pr.proteinPct * (1 - limePct) - P) / denom;
      const y = 1 - x - limePct;
      if (x < 0.05 || y < 0.05 || x > 0.95 || y > 0.95) continue;

      const costPerKg = x * e.pricePerKg + y * pr.pricePerKg + limePct * lime.pricePerKg;
      const proteinPct = x * e.proteinPct + y * pr.proteinPct;

      const dailyKg = (birds * target.gramsPerBirdDay) / 1000;
      const dailyCost = dailyKg * costPerKg;

      const mix = [
        { ingredient: e,   kg: +(x * dailyKg).toFixed(2),        pct: +(x * 100).toFixed(1),        cost: +(x * dailyKg * e.pricePerKg).toFixed(0) },
        { ingredient: pr,  kg: +(y * dailyKg).toFixed(2),        pct: +(y * 100).toFixed(1),        cost: +(y * dailyKg * pr.pricePerKg).toFixed(0) },
        { ingredient: lime,kg: +(limePct * dailyKg).toFixed(2),  pct: +(limePct * 100).toFixed(1),  cost: +(limePct * dailyKg * lime.pricePerKg).toFixed(0) },
      ];

      const candidate: FeedPlan = {
        stage, species, birds, mix,
        proteinPct: +proteinPct.toFixed(1),
        costPerKg: +costPerKg.toFixed(2),
        dailyKg: +dailyKg.toFixed(2),
        dailyCost: Math.round(dailyCost),
        monthlyCost: Math.round(dailyCost * 30),
      };
      if (!best || candidate.costPerKg < best.costPerKg) best = candidate;
    }
  }
  return best;
}

/**
 * One bird's feed cost for one week at a given species and stage, using the
 * same least-cost mix logic as the full Feed Plan module. Feeds directly
 * into computeFeasibility's per-species budget reserve so both modules use
 * one real number instead of a guess.
 */
export function feedCostPerBirdPerWeek(stage: BirdStage, ingredients: FeedIngredient[], species: PoultryType = "chicken"): number | null {
  const plan = computeFeedPlan(stage, 1, ingredients, species);
  if (!plan) return null;
  return Math.round(plan.dailyCost * 7 * 100) / 100;
}

// --- Triage ----------------------------------------------------------------

export interface TriageResult {
  topConditionId: string;
  conditionName: string;
  urgency: "low" | "medium" | "high";
  confidencePct: number;
  note: string;
  ranked: { id: string; name: string; score: number }[];
}

export function triage(selectedSymptomIds: string[], hasPhoto: boolean): TriageResult | null {
  if (selectedSymptomIds.length === 0) return null;
  const scores: Record<string, number> = {};
  for (const sid of selectedSymptomIds) {
    const rule = SYMPTOMS.find((s) => s.id === sid);
    if (!rule) continue;
    for (const [cond, w] of Object.entries(rule.weights)) {
      scores[cond] = (scores[cond] ?? 0) + (w ?? 0);
    }
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const ranked = Object.entries(scores)
    .map(([id, score]) => ({ id, name: CONDITIONS[id].name, score }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  // Honest confidence: cap at 75% without a photo, 85% with one, scale by dominance.
  const dominance = top.score / total;
  const cap = hasPhoto ? 0.85 : 0.75;
  const confidencePct = Math.round(Math.min(cap, 0.35 + dominance * 0.5) * 100);

  const cond = CONDITIONS[top.id];
  return {
    topConditionId: top.id,
    conditionName: cond.name,
    urgency: cond.urgency,
    confidencePct,
    note: cond.note,
    ranked,
  };
}

// --- Distance --------------------------------------------------------------

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}