import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signUp, signInWithGoogle } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/SiteHeader";
import { toast } from "sonner";

import farmerImage from "@/assets/farmer.jpg";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account · PoultryFit Kenya" }] }),
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(name, email, password);
      toast.success("Welcome. Let's set up your yard.");
      navigate({ to: "/onboarding" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
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
        <img src={farmerImage} alt="" aria-hidden className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,oklch(0.30_0.09_155/0.92),oklch(0.18_0.04_155/0.85)_60%,oklch(0.42_0.13_150/0.75))]" />
      </div>

      <SiteHeader />

      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-center justify-center px-6 py-12">
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-3xl border border-gold/30 bg-background/95 p-8 shadow-[0_30px_60px_-20px_rgba(0,40,20,0.5)] backdrop-blur-xl"
        >
          <h1 className="font-display text-3xl">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Free while in pilot. Takes a minute.</p>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={google} disabled={loading}>
            Continue with Google
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already a member?{" "}
            <Link to="/signin" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}