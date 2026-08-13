import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Ruler, Wheat, Stethoscope, MapPin } from "lucide-react";

import heroImage from "@/assets/mixed-flock.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PoultryFit Kenya" },
      { name: "description", content: "Plan your flock the smart way. Built for Kenyan keepers." },
      { property: "og:title", content: "PoultryFit Kenya" },
      { property: "og:description", content: "Plan your flock the smart way." },
      { property: "og:image", content: heroImage },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && user) navigate({ to: "/dashboard" });
  }, [ready, user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO with washed background image */}
      <section className="relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
          />
          {/* Washes: green tint + ivory fade + gold glow */}
          <div className="absolute inset-0 bg-[linear-gradient(120deg,oklch(0.42_0.13_150/0.78),oklch(0.985_0.012_95/0.55)_55%,oklch(0.78_0.14_85/0.35))]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.78_0.14_85/0.35),transparent_60%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 py-24 md:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-background/60 px-3 py-1 text-xs font-medium text-gold backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Kenya wide
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.02] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,40,20,0.45)] md:text-7xl">
            Karibu. <br />
            <span className="gold-underline">Raise a healthier flock.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/90 drop-shadow">
            Space, feed, health and a vet nearby all come together in one calm, practical app made for Kenyan backyards.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup">
              <Button size="lg" className="gap-2 bg-gold text-[oklch(0.2_0.04_80)] hover:bg-gold-deep">
                Create your account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/signin">
              <Button size="lg" variant="outline" className="border-white/60 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white">
                I already have one
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* What's inside */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-gold">What's inside</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">Everything a keeper actually needs.</h2>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile icon={Ruler} title="Flock size" body="Size your flock to fit your space." />
          <Tile icon={Wheat} title="Feed plan" body="Daily rations and monthly feed cost." />
          <Tile icon={Stethoscope} title="Health triage" body="Check symptoms and know the next step." />
          <Tile icon={MapPin} title="Find a vet" body="Locate nearby vets and agrovets." />
        </div>
      </section>
    </div>
  );
}

function Tile({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition hover:border-gold/60 hover:shadow-[0_10px_30px_-15px_oklch(0.42_0.13_150/0.4)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf/10 text-leaf">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-display text-lg">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
