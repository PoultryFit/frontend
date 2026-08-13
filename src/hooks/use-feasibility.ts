import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getCountyBylaw } from "@/lib/bylaws.functions";
import { getFeedIngredients } from "@/lib/feed.functions";
import { computeFeasibility, feedCostPerBirdPerWeek, type FeasibilityResult } from "@/lib/poultry-calc";
import type { PoultryType } from "@/lib/auth";

/**
 * Pulls the signed-in farmer's profile, fetches their county bylaw and real
 * feed ingredient prices, and computes the feasibility result, the same
 * steps every dashboard page needs, now centralized so each route file
 * doesn't refetch/recompute it independently. The feed prices are what let
 * the budget constraint reserve real feed money, not just bird-stock cost,
 * computed per selected species since each needs a different amount.
 */
export function useFeasibilitySnapshot() {
  const { profile } = useAuth();
  const fetchBylaw = useServerFn(getCountyBylaw);
  const fetchIngredients = useServerFn(getFeedIngredients);

  const { data: bylaw, isLoading } = useQuery({
    queryKey: ["county_bylaw", profile?.county ?? null, profile?.ward ?? null],
    queryFn: () =>
      fetchBylaw({ data: { county: profile!.county, sub_county: profile!.ward || undefined } }),
    enabled: !!profile?.county,
    staleTime: 5 * 60_000,
  });

  const { data: ingredients } = useQuery({
    queryKey: ["feed_ingredients", profile?.county ?? null],
    queryFn: () => fetchIngredients({ data: { county: profile?.county } }),
    enabled: !!profile,
    staleTime: 5 * 60_000,
  });

  const feas = useMemo<FeasibilityResult | null>(() => {
    if (!profile) return null;
    const speciesList: PoultryType[] = profile.poultryTypes?.length ? profile.poultryTypes : ["chicken"];
    const feedCosts: Partial<Record<PoultryType, number | null>> = {};
    if (ingredients) {
      for (const species of speciesList) {
        feedCosts[species] = feedCostPerBirdPerWeek(profile.startingStage, ingredients, species);
      }
    }
    return computeFeasibility(profile, bylaw?.countyBylaw ?? null, feedCosts);
  }, [profile, bylaw, ingredients]);

  return { profile, bylaw, feas, isLoading };
}