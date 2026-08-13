import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/SiteHeader";
import { toast } from "sonner";
import { Check } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password · PoultryFit Kenya" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
          {sent ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-5 w-5" />
              </div>
              <h1 className="mt-4 font-display text-2xl">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                If an account exists for {email}, we've sent a link to reset your password. Open it on this device to continue.
              </p>
              <Link to="/signin" className="mt-6 inline-block text-sm text-primary underline-offset-4 hover:underline">
                Back to sign in
              </Link>
            </>
          ) : (
            <form onSubmit={submit}>
              <h1 className="font-display text-2xl">Reset your password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your account email and we'll send you a reset link.
              </p>
              <div className="mt-6">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <Button type="submit" className="mt-6 w-full" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link to="/signin" className="text-primary underline-offset-4 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}