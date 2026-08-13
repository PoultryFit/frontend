import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ML_SYMPTOM_GROUPS, ML_SYMPTOMS, POULTRY_LABEL } from "@/lib/poultry-data";
import { predictDisease, type PredictDiseaseResult } from "@/lib/disease.functions";
import type { PoultryType } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Upload,
  AlertTriangle,
  ShieldCheck,
  Stethoscope,
  Check,
  Loader2,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "symptoms" | "loading" | "bird-photo" | "droppings-photo" | "done";

interface DisplayResult {
  urgency: "low" | "medium" | "high";
  conditionName: string;
  note: string;
  confidencePct: number;
  source: "server" | "fallback";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function HealthTriageModule() {
  const { profile } = useAuth();
  const speciesOptions: PoultryType[] = profile?.poultryTypes?.length
    ? profile.poultryTypes
    : ["chicken"];
  const [species, setSpecies] = useState<PoultryType>(speciesOptions[0]);

  const [selected, setSelected] = useState<string[]>([]);
  const [chickenPhoto, setChickenPhoto] = useState<string | null>(null);
  const [droppingsPhoto, setDroppingsPhoto] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("symptoms");
  const [serverResult, setServerResult] = useState<PredictDiseaseResult | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const predictFn = useServerFn(predictDisease);
  const mutation = useMutation({
    mutationFn: (input: {
      symptoms: string[];
      chickenPhotoBase64?: string;
      droppingsPhotoBase64?: string;
    }) =>
      predictFn({
        data: {
          symptoms: input.symptoms,
          species,
          ...(input.chickenPhotoBase64 ? { chickenPhotoBase64: input.chickenPhotoBase64 } : {}),
          ...(input.droppingsPhotoBase64
            ? { droppingsPhotoBase64: input.droppingsPhotoBase64 }
            : {}),
        },
      }),
    onSuccess: (res) => {
      setServerResult(res);
      setUsedFallback(false);
    },
    onError: () => {
      setUsedFallback(true);
    },
  });

  const result = useMemo<DisplayResult | null>(() => {
    if (serverResult) {
      const t = serverResult.top;
      if (t) {
        return {
          urgency: (t.urgency as "low" | "medium" | "high") ?? "medium",
          conditionName: t.name,
          note:
            serverResult.advice ||
            t.treatment_notes ||
            t.prevention ||
            "See a vet for confirmation.",
          confidencePct: serverResult.confidencePct ?? Math.min(90, 40 + t.score * 15),
          source: "server",
        };
      }
      return null;
    }
    return null;
  }, [serverResult]);

  const toggleSymptom = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const runInitialDiagnosis = () => {
    if (selected.length === 0) return;
    setStep("loading");
    mutation.mutate({ symptoms: selected }, { onSettled: () => setStep("bird-photo") });
  };

  const handleBirdPhoto = async (file: File) => {
    const b64 = await fileToBase64(file);
    setChickenPhoto(b64);
    setStep("loading");
    mutation.mutate(
      { symptoms: selected, chickenPhotoBase64: b64 },
      { onSettled: () => setStep("droppings-photo") },
    );
  };

  const handleDroppingsPhoto = async (file: File) => {
    const b64 = await fileToBase64(file);
    setDroppingsPhoto(b64);
    setStep("loading");
    mutation.mutate(
      {
        symptoms: selected,
        ...(chickenPhoto ? { chickenPhotoBase64: chickenPhoto } : {}),
        droppingsPhotoBase64: b64,
      },
      { onSettled: () => setStep("done") },
    );
  };

  const restart = () => {
    setSelected([]);
    setChickenPhoto(null);
    setDroppingsPhoto(null);
    setServerResult(null);
    setUsedFallback(false);
    setStep("symptoms");
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div>
        <p className="text-sm text-muted-foreground">
          Mark what you're seeing in your flock. This gives you a{" "}
          <span className="font-medium text-foreground">hint, not a diagnosis</span>.
        </p>

        {speciesOptions.length > 1 && step === "symptoms" && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Checking:</span>
            {speciesOptions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpecies(s)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  species === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50",
                )}
              >
                {POULTRY_LABEL[s]}
              </button>
            ))}
          </div>
        )}

        {step === "symptoms" && (
          <div className="mt-4 space-y-4 animate-fade-in">
            {ML_SYMPTOM_GROUPS.map((group) => (
              <div key={group.title} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.keys.map((key) => {
                    const sym = ML_SYMPTOMS.find((s) => s.key === key);
                    if (!sym) return null;
                    const active = selected.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleSymptom(key)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:border-primary/50",
                        )}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        {sym.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-2xl border border-dashed border-border bg-secondary/30 p-4">
              <p className="text-sm text-muted-foreground">
                {selected.length === 0
                  ? "Tap any symptoms you're seeing."
                  : `${selected.length} symptom${selected.length > 1 ? "s" : ""} marked.`}
              </p>
              <Button onClick={runInitialDiagnosis} disabled={selected.length === 0}>
                Find diagnosis
              </Button>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="mt-4 animate-fade-in rounded-2xl border border-border bg-card p-10 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 font-display text-lg">Checking your flock's symptoms…</p>
            <p className="mt-1 text-sm text-muted-foreground">
              First check after a while can take up to a minute while the model wakes up.
            </p>
          </div>
        )}

        {step === "bird-photo" && (
          <PhotoStep
            title="Add a photo of the bird?"
            desc="Optional, but a clear photo can sharpen the result. Entirely skippable."
            preview={chickenPhoto}
            onCapture={handleBirdPhoto}
            onSkip={() => setStep("droppings-photo")}
          />
        )}

        {step === "droppings-photo" && (
          <PhotoStep
            title="Photo of the droppings too?"
            desc="Also optional. Helps catch digestive issues a symptom list alone can miss."
            preview={droppingsPhoto}
            onCapture={handleDroppingsPhoto}
            onSkip={() => setStep("done")}
          />
        )}

        {step === "done" && (
          <div className="mt-4 animate-fade-in flex flex-wrap gap-2">
            <Button variant="outline" onClick={restart}>
              Start a new check
            </Button>
          </div>
        )}
      </div>

      <div>
        {result ? (
          <div
            className={cn(
              "animate-fade-in rounded-2xl border p-6",
              result.urgency === "high"
                ? "border-destructive/40 bg-destructive/5"
                : result.urgency === "medium"
                  ? "border-clay/40 bg-clay/5"
                  : "border-border bg-card",
            )}
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              {result.urgency === "high" ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : result.urgency === "medium" ? (
                <Stethoscope className="h-4 w-4 text-clay" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-primary" />
              )}
              {result.urgency} urgency
            </div>
            {serverResult?.source === "stub" && (
              <div className="mt-3 rounded-md border border-clay/30 bg-clay/5 px-3 py-2 text-[11px] uppercase tracking-wider text-clay">
                Model service unavailable, showing a keyword-based estimate instead.
              </div>
            )}
            {(chickenPhoto || droppingsPhoto) && (
              <div className="mt-3 flex gap-2">
                {chickenPhoto && (
                  <img
                    src={chickenPhoto}
                    alt="Bird"
                    className="h-16 w-16 rounded-lg object-cover border border-border"
                  />
                )}
                {droppingsPhoto && (
                  <img
                    src={droppingsPhoto}
                    alt="Droppings"
                    className="h-16 w-16 rounded-lg object-cover border border-border"
                  />
                )}
              </div>
            )}
            <p className="mt-3 font-display text-xl">{result.conditionName}</p>
            <p className="mt-2 text-sm text-muted-foreground">{result.note}</p>

            <div className="mt-4 rounded-lg bg-background/70 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium">{result.confidencePct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${result.confidencePct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                We deliberately cap confidence. Please confirm with a professional before treating.
              </p>
            </div>
          </div>
        ) : usedFallback ? (
          <div className="rounded-2xl border border-clay/40 bg-clay/5 p-6 text-sm text-clay">
            Couldn't reach the server to check symptoms. Check your connection and try again.
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            {step === "symptoms"
              ? "Mark symptoms, then tap Find diagnosis to see a suggested next step."
              : "Working on it…"}
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoStep({
  title,
  desc,
  preview,
  onCapture,
  onSkip,
}: {
  title: string;
  desc: string;
  preview: string | null;
  onCapture: (file: File) => void;
  onSkip: () => void;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onCapture(f);
  };

  return (
    <div className="mt-4 animate-fade-in rounded-2xl border border-border bg-card p-6">
      <p className="font-display text-xl">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>

      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="mt-4 h-24 w-24 rounded-lg object-cover border border-border"
        />
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => cameraInput.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:brightness-110"
        >
          <Camera className="h-4 w-4" /> Take photo
        </button>
        <button
          type="button"
          onClick={() => uploadInput.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:border-primary/50"
        >
          <Upload className="h-4 w-4" /> Upload photo
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-muted-foreground transition hover:border-primary/50"
        >
          <SkipForward className="h-4 w-4" /> Skip
        </button>
      </div>

      {/* capture="environment" opens the rear camera directly on mobile */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onChange}
      />
      <input
        ref={uploadInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}