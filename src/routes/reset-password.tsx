import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { updatePassword } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/SiteHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password · PoultryFit Kenya" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      toast.success("Password updated. Sign in with your new password.");
      navigate({ to: "/signin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h1 className="font-display text-2xl">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This link only works once, and only from the email that requested it.
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
          </div>
          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </main>
    </div>
  );
}