"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";

/**
 * Server state lives in TanStack Query, never in Zustand. Zustand keeps only
 * genuinely client-side state (which child is selected, sound on/off, the
 * mobile drawer).
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Auth and permission failures are final; retrying only delays
              // the redirect and burns rate limit.
              if (error instanceof ApiError) {
                if (error.isUnauthorized || error.isForbidden || error.isNotFound) return false;
                if (error.status === 429) return false;
              }
              return failureCount < 2;
            },
          },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
