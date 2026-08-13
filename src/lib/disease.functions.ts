import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const InputSchema = z.object({
  symptoms: z.array(z.string().min(1)).min(1).max(60),
  species: z.string().min(1).max(50).default("chicken"),
  chickenPhotoBase64: z.string().max(8_000_000).optional(),
  droppingsPhotoBase64: z.string().max(8_000_000).optional(),
});

interface DiseaseMatch {
  slug: string;
  name: string;
  score: number;
  urgency: string;
  prevention: string | null;
  treatment_notes: string | null;
}

export interface PredictDiseaseResult {
  source: "ml" | "stub";
  top: DiseaseMatch | null;
  ranked: DiseaseMatch[];
  advice: string;
  confidencePct: number | null;
  modelSources: string[];
  logged_id: string | null;
}

// Shape returned by disease-api's POST /predict (see disease-api/app.py).
// Only chicken/duck/quail/turkey are in the model's training data; other
// PoultryType values fall back to "chicken" server-side in app.py.
interface MlPredictionResponse {
  disease: string;
  confidence: number;
  symptoms_matched: string[];
  model_sources: string[];
  warnings: string[];
}

/**
 * Disease prediction. Calls the external ML service when ML_SERVICE_URL is set;
 * otherwise (or if that call fails) falls back to a keyword-overlap match
 * against the `diseases` table so the frontend still returns something useful.
 */
export const predictDisease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }): Promise<PredictDiseaseResult> => {
    const { symptoms, species, chickenPhotoBase64, droppingsPhotoBase64 } = data;
    const mlUrl = process.env.ML_SERVICE_URL;
    const mlKey = process.env.ML_SERVICE_API_KEY;

    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const publicClient = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: rows } = await publicClient.from("diseases").select("*");
    const list = rows ?? [];

    let source: "ml" | "stub" = "stub";
    let top: DiseaseMatch | null = null;
    let ranked: DiseaseMatch[] = [];
    let confidencePct: number | null = null;
    let modelSources: string[] = [];
    let mlPayload: MlPredictionResponse | null = null;
    let mlWarning: string | null = null;

    if (mlUrl) {
      try {
        const res = await fetch(`${mlUrl.replace(/\/$/, "")}/predict`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(mlKey ? { authorization: `Bearer ${mlKey}` } : {}),
          },
          body: JSON.stringify({
            symptoms,
            species,
            ...(chickenPhotoBase64 ? { chicken_image_base64: chickenPhotoBase64 } : {}),
            ...(droppingsPhotoBase64 ? { droppings_image_base64: droppingsPhotoBase64 } : {}),
          }),
          // Render free tier can take 30-50s to wake from sleep on the first
          // request after idling; give it real room before falling back.
          signal: AbortSignal.timeout(45_000),
        });
        if (res.ok) {
          mlPayload = (await res.json()) as MlPredictionResponse;
          source = "ml";
          confidencePct = Math.round(mlPayload.confidence * 100);
          modelSources = mlPayload.model_sources ?? [];
          if (mlPayload.warnings?.length) mlWarning = mlPayload.warnings.join(" ");

          // The model returns a disease *name*, join it back to our table by
          // name (case-insensitive) to get slug/urgency/prevention/treatment.
          const found = list.find((d) => d.name.toLowerCase() === mlPayload!.disease.toLowerCase());
          top = found
            ? {
                slug: found.slug,
                name: found.name,
                score: mlPayload.confidence,
                urgency: found.urgency,
                prevention: found.prevention,
                treatment_notes: found.treatment_notes,
              }
            : {
                // ML knows a disease our table hasn't been seeded with yet —
                // still surface it, just without prevention/treatment copy.
                slug: mlPayload.disease.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                name: mlPayload.disease,
                score: mlPayload.confidence,
                urgency: "medium",
                prevention: null,
                treatment_notes: null,
              };
          ranked = top ? [top] : [];
        } else {
          mlWarning = `ML service returned ${res.status}`;
        }
      } catch (err) {
        mlWarning = err instanceof Error ? err.message : "ML service unreachable";
      }
    }

    // Fallback: keyword overlap against the diseases table.
    if (source === "stub") {
      const symLower = symptoms.map((s) => s.toLowerCase());
      ranked = list
        .filter((d) => (d.species ?? []).length === 0 || d.species.includes(species))
        .map((d) => {
          const dSyms = (d.symptoms ?? []).map((s) => s.toLowerCase());
          const score = dSyms.reduce(
            (acc, ds) => acc + (symLower.some((s) => ds.includes(s) || s.includes(ds)) ? 1 : 0),
            0,
          );
          return {
            slug: d.slug,
            name: d.name,
            score,
            urgency: d.urgency,
            prevention: d.prevention,
            treatment_notes: d.treatment_notes,
          };
        })
        .sort((a, b) => b.score - a.score);
      top = ranked[0]?.score ? ranked[0] : null;
    }

    const advice = top
      ? `Most likely: ${top.name}. Urgency: ${top.urgency}. ${top.treatment_notes ?? ""}`
      : "No clear match. Please describe more symptoms or consult a vet.";

    // Persist the prediction for the current user
    let logged_id: string | null = null;
    const { data: ins } = await context.supabase
      .from("disease_predictions")
      .insert({
        user_id: context.userId,
        species,
        symptoms,
        top_disease_slug: top?.slug ?? null,
        ml_response: (mlPayload ?? { source, ranked, warning: mlWarning }) as never,
      })
      .select("id")
      .single();
    if (ins) logged_id = ins.id;

    return {
      source,
      top,
      ranked,
      advice:
        mlWarning && source === "stub"
          ? `${advice} (Model service unavailable: ${mlWarning})`
          : advice,
      confidencePct,
      modelSources,
      logged_id,
    };
  });

/**
 * Fetch the model's real symptom list so the UI can offer exactly what the
 * model was trained on, rather than a hand-maintained subset. Falls back to
 * an empty list (the frontend keeps its own static copy) if the ML service
 * is unset or unreachable.
 */
export const getMlSymptoms = createServerFn({ method: "GET" }).handler(async () => {
  const mlUrl = process.env.ML_SERVICE_URL;
  if (!mlUrl) return { symptoms: [] as string[] };
  try {
    const res = await fetch(`${mlUrl.replace(/\/$/, "")}/symptoms`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { symptoms: [] as string[] };
    const json = (await res.json()) as { symptoms: string[] };
    return { symptoms: json.symptoms ?? [] };
  } catch {
    return { symptoms: [] as string[] };
  }
});