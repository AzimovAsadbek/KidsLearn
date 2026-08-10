"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@kidslearn/types";
import { useSession } from "./session-provider";
import { Spinner } from "@/components/ui/button";

/**
 * Client-side route protection.
 *
 * This is a UX affordance only — it stops a signed-out visitor seeing an empty
 * dashboard skeleton. Every one of these routes is also enforced server-side by
 * the API's guards, which is where the actual security lives.
 */
export function RouteGuard({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, loading, isAuthenticated } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
      return;
    }

    if (role && user?.role !== role) {
      // Send people to the surface they *can* use rather than a dead end.
      router.replace(user?.role === "ADMIN" ? "/admin" : "/dashboard");
    }
  }, [loading, isAuthenticated, role, user?.role, router, pathname]);

  if (loading || !isAuthenticated || (role && user?.role !== role)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background" aria-busy="true">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-7 w-7 text-primary" />
          <p className="t-body-sm text-content-secondary">Checking your session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
