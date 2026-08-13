import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signIn, signInWithGoogle, hydrateProfileFromFarm } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/SiteHeader";
import { toast } from "sonner";

import coopImage from "@/assets/coop.jpg";

export const Route = createFileRoute("/signin")({
  head: () => ({ meta: [{ title: "Sign in · PoultryFit Kenya" }] }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await signIn(email, password);
      const profile = await hydrateProfileFromFarm(user.id);
      toast.success("Welcome back.");
      navigate({ to: profile ? "/dashboard" : "/onboarding" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <img src={coopImage} alt="" aria-hidden className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,oklch(0.30_0.09_155/0.92),oklch(0.18_0.04_155/0.85)_60%,oklch(0.42_0.13_150/0.75))]" />
      </div>

      <SiteHeader />

      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-center justify-center px-6 py-12">
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-3xl border border-gold/30 bg-background/95 p-8 shadow-[0_30px_60px_-20px_rgba(0,40,20,0.5)] backdrop-blur-xl"
        >
          <h1 className="font-display text-3xl">Karibu tena.</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to pick up your flock plan.</p>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary underline-offset-4 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={google} disabled={loading}>
            Continue with Google
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}