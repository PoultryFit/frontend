import { QueryClient } from "@tanstack/react-query";

/**
 * Create a fresh QueryClient per request. Under SSR a module-level
 * singleton would leak cached data between different users' requests
 * on the same worker instance, so callers (getRouter) must call this
 * factory once per router creation.
 */
export function createQueryClient() {
  return new QueryClient();
}

export function getContext() {
  return { queryClient: createQueryClient() };
}
