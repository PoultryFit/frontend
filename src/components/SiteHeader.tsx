import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import logoAsset from "@/assets/logo.png";


export function SiteHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center">
          <img
            src={logoAsset}
            alt="PoultryFit Kenya"
            className="h-9 w-auto"
          />
        </Link>


        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/" activeOptions={{ exact: true }} className="hover:text-foreground data-[status=active]:text-foreground">Home</Link>
          {user && (
            <Link to="/dashboard" className="hover:text-foreground data-[status=active]:text-foreground">Dashboard</Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:block">
                {user.name}
              </span>
              <Button size="sm" variant="outline" onClick={() => { void signOut(); }} className="gap-1.5">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/signin" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
              <Link to="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
