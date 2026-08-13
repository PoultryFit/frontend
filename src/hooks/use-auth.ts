import { useEffect, useState } from "react";
import {
  getCurrentUser,
  getProfile,
  hydrateProfileFromFarm,
  type AuthUser,
  type FarmerProfile,
} from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // `ready` only flips true once BOTH the auth session and (when a user
    // is present) the profile-hydration attempt have settled. Critically,
    // `user`, `profile`, and `ready` are all set together in one batch,
    // never individually, so no consumer can ever observe an intermediate
    // state where `user` is truthy but `profile` is still stale from a
    // previous cycle. An earlier version set `user` immediately and
    // `profile`/`ready` only after the async hydration resolved, which
    // created exactly that intermediate "authenticated, no profile yet"
    // render, misfiring the /onboarding redirect for returning users.
    const sync = async () => {
      const u = getCurrentUser();
      if (cancelled) return;
      let p = getProfile();
      if (u && !p) {
        p = await hydrateProfileFromFarm(u.id);
        if (cancelled) return;
      }
      setUser(u);
      setProfile(p);
      setReady(true);
    };

    void sync();
    const onEvent = () => {
      void sync();
    };
    window.addEventListener("poultryfit-auth", onEvent);
    window.addEventListener("storage", onEvent);
    return () => {
      cancelled = true;
      window.removeEventListener("poultryfit-auth", onEvent);
      window.removeEventListener("storage", onEvent);
    };
  }, []);

  return { user, profile, ready };
}