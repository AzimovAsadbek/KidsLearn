import { Suspense } from "react";
import { KidShell } from "@/components/kid/kid-shell";
import { RouteGuard } from "@/components/providers/route-guard";
import { ChildProvider } from "@/components/providers/child-provider";

export default function ChildLayout({ children }: LayoutProps<"/">) {
  return (
    // Kid mode needs a signed-in family, but not a specific role: a parent
    // hands the device over without switching accounts.
    <RouteGuard>
      <Suspense fallback={null}>
        <ChildProvider>
          <KidShell>{children}</KidShell>
        </ChildProvider>
      </Suspense>
    </RouteGuard>
  );
}
