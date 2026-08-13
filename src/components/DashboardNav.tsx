import { Link } from "@tanstack/react-router";
import { Home, Ruler, Wheat, Stethoscope, MapPin } from "lucide-react";

const ITEMS = [
  { to: "/dashboard", label: "Home", icon: Home, exact: true },
  { to: "/dashboard/feasibility", label: "Flock size", icon: Ruler, exact: false },
  { to: "/dashboard/feed", label: "Feed plan", icon: Wheat, exact: false },
  { to: "/dashboard/health", label: "Health", icon: Stethoscope, exact: false },
  { to: "/dashboard/find", label: "Find help", icon: MapPin, exact: false },
] as const;

/**
 * Below md (768px, roughly phone width): a fixed bottom tab bar, the
 * pattern every phone app uses since it's where thumbs naturally sit.
 * md and above (tablets in normal use, laptops, desktop browsers): a
 * horizontal bar near the top, same footprint as the old Tabs component.
 * Only one of the two is ever visible at a time.
 */
export function DashboardNav() {
  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-1">
          {ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <nav className="hidden gap-1 rounded-xl border border-border bg-card p-1 md:flex">
        {ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "bg-primary text-primary-foreground hover:text-primary-foreground shadow-sm" }}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}