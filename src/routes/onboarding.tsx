import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  saveProfile,
  type HousingType,
  type BirdGoal,
  type Experience,
  type PoultryType,
  type StartingStage,
} from "@/lib/auth";
import { COUNTIES } from "@/lib/poultry-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/SiteHeader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Egg, Droplets, Drumstick, ShieldAlert, Feather, Bug, type LucideIcon } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Set up your yard · PoultryFit Kenya" }] }),
  component: OnboardingPage,
});

const POULTRY_OPTIONS: { id: PoultryType; label: string; Icon: LucideIcon; hint: string }[] = [
  { id: "chicken", label: "Chicken", Icon: Egg, hint: "Layers for daily eggs" },
  { id: "duck", label: "Duck", Icon: Droplets, hint: "Thrives near water pans" },
  { id: "turkey", label: "Turkey", Icon: Drumstick, hint: "Big birds for December sales" },
  { id: "goose", label: "Goose", Icon: ShieldAlert, hint: "Loud alarm for intruders" },
  { id: "quail", label: "Quail", Icon: Feather, hint: "Tiny footprint, premium eggs" },
  { id: "guinea-fowl", label: "Guinea fowl", Icon: Bug, hint: "Eats ticks and shamba pests" },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [step, setStep] = useState(0);
  const [county, setCounty] = useState<string>("Kiambu");
  const [ward, setWard] = useState("");
  const [poultryTypes, setPoultryTypes] = useState<PoultryType[]>(["chicken"]);
  const [speciesRatio, setSpeciesRatio] = useState<Partial<Record<PoultryType, number>>>({});
  const [lengthM, setLengthM] = useState<number>(3);
  const [widthM, setWidthM] = useState<number>(2);
  const spaceM2 = Math.max(0, Math.round(lengthM * widthM));
  const [budgetKes, setBudgetKes] = useState<number>(15000);
  const [housing, setHousing] = useState<HousingType>("deep-litter");
  const [goal, setGoal] = useState<BirdGoal>("eggs");
  const [experience, setExperience] = useState<Experience>("first-time");
  const [startingStage, setStartingStage] = useState<StartingStage>("chick");
  const [saving, setSaving] = useState(false);

  if (ready && !user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <p className="text-muted-foreground">
            Please{" "}
            <Link to="/signup" className="text-primary underline">
              create an account
            </Link>{" "}
            first.
          </p>
        </div>
      </div>
    );
  }

  const togglePoultry = (id: PoultryType) => {
    const wasActive = poultryTypes.includes(id);
    setPoultryTypes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    if (wasActive) {
      setSpeciesRatio((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const setPriority = (id: PoultryType, value: number) => {
    setSpeciesRatio((prev) => ({ ...prev, [id]: Math.max(1, Math.min(5, value)) }));
  };

  const finish = async () => {
    if (poultryTypes.length === 0) {
      toast.error("Pick at least one type of bird you want to keep.");
      return;
    }
    setSaving(true);
    const result = await saveProfile({
      county,
      ward: ward.trim() || undefined,
      spaceM2,
      lengthM,
      widthM,
      budgetKes,
      housing,
      goal,
      experience,
      startingStage,
      poultryTypes,
      speciesRatio: poultryTypes.length > 1 ? speciesRatio : undefined,
      createdAt: new Date().toISOString(),
    });
    setSaving(false);
    if (!result.synced) {
      toast.error(
        "Saved on this device, but couldn't sync to your account. You may see this setup again on another device. " +
          (result.error ? `(${result.error})` : ""),
      );
      // Still navigate, the local cache means this device works fine, we just
      // warned them the cross-device sync failed rather than hiding it.
      navigate({ to: "/dashboard" });
      return;
    }
    toast.success("Yard saved. Here's your plan.");
    navigate({ to: "/dashboard" });
  };

  const steps = [
    { title: "Where are you?", desc: "So we can apply your county's rules." },
    {
      title: "Which birds do you want to keep?",
      desc: "Chicken, duck, turkey, pick all that apply.",
    },
    { title: "Your yard & budget", desc: "So we can size the flock to fit." },
    { title: "Your goal & experience", desc: "So we tune the advice." },
  ];

  const canNext =
    (step === 0 && county.length > 0) || (step === 1 && poultryTypes.length > 0) || step >= 2;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 flex items-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-border")}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h2 className="font-display text-2xl">{steps[step].title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{steps[step].desc}</p>

          {step === 0 && (
            <div className="mt-6 space-y-4">
              <div>
                <Label>County</Label>
                <select
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {COUNTIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ward">Ward / estate (optional)</Label>
                <Input
                  id="ward"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="e.g. Juja, Kitengela"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mt-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {POULTRY_OPTIONS.map((p) => {
                  const active = poultryTypes.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePoultry(p.id)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition",
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-gold/40"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <p.Icon
                        className={cn("h-6 w-6", active ? "text-primary" : "text-muted-foreground")}
                        strokeWidth={1.75}
                      />
                      <span className="font-display text-base">{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.hint}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                You can raise more than one kind of bird, we'll adjust your plan for the mix.
              </p>
              {poultryTypes.length > 1 && (
                <div className="mt-4 space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
                  <p className="text-sm font-medium">How should we split your space and budget?</p>
                  <p className="text-xs text-muted-foreground">
                    Higher priority means more of your space and budget goes to that bird. Equal by
                    default.
                  </p>
                  <div className="mt-2 space-y-2">
                    {poultryTypes.map((id) => {
                      const label = POULTRY_OPTIONS.find((p) => p.id === id)?.label ?? id;
                      const value = speciesRatio[id] ?? 1;
                      return (
                        <div key={id} className="flex items-center justify-between gap-3">
                          <span className="text-sm">{label}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPriority(id, value - 1)}
                              disabled={value <= 1}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm hover:border-primary/50 disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-medium">{value}</span>
                            <button
                              type="button"
                              onClick={() => setPriority(id, value + 1)}
                              disabled={value >= 5}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm hover:border-primary/50 disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 space-y-5">
              <div>
                <Label>Yard dimensions</Label>
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      step={0.5}
                      value={lengthM}
                      onChange={(e) => setLengthM(+e.target.value)}
                      placeholder="Length"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Length (m)</p>
                  </div>
                  <div>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      step={0.5}
                      value={widthM}
                      onChange={(e) => setWidthM(+e.target.value)}
                      placeholder="Width"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Width (m)</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  ≈ <span className="font-medium text-foreground">{spaceM2} m²</span> of floor for
                  the coop or run.
                </p>
              </div>
              <div>
                <Label>Startup budget (KES)</Label>
                <Input
                  type="number"
                  min={1000}
                  step={500}
                  value={budgetKes}
                  onChange={(e) => setBudgetKes(+e.target.value)}
                />
              </div>
              <div>
                <Label>Housing type</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["backyard-open", "deep-litter", "cage", "free-range"] as HousingType[]).map(
                    (h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHousing(h)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm capitalize transition",
                          housing === h
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50",
                        )}
                      >
                        {h.replace("-", " ")}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-6 space-y-5">
              <div>
                <Label>Main goal</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["eggs", "meat", "dual"] as BirdGoal[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGoal(g)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm capitalize",
                        goal === g
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Experience</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["first-time", "First time"],
                      ["some", "Some"],
                      ["experienced", "Experienced"],
                    ] as [Experience, string][]
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setExperience(v)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm",
                        experience === v
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>What are you starting with?</Label>
                <div className="mt-2 grid gap-2">
                  {(
                    [
                      [
                        "chick",
                        "Day-old chicks",
                        "Takes longer to first eggs, but costs less per bird up front.",
                      ],
                      [
                        "grower",
                        "Growers (a few weeks old)",
                        "A middle ground on cost and time to first eggs.",
                      ],
                      [
                        "layer",
                        "Point-of-lay or mature birds",
                        "Costs more per bird, but starts producing eggs immediately.",
                      ],
                    ] as [StartingStage, string, string][]
                  ).map(([v, label, hint]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setStartingStage(v)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition",
                        startingStage === v
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <div className={cn("font-medium", startingStage === v && "text-primary")}>
                        {label}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Next
              </Button>
            ) : (
              <Button onClick={finish} disabled={saving}>
                {saving ? "Saving…" : "See my plan"}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
