import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RouteGuard } from "@/components/providers/route-guard";
import { ChildProvider } from "@/components/providers/child-provider";
import { HeaderChildSwitcher } from "@/features/parent/child-switcher";

export default function ParentLayout({ children }: LayoutProps<"/">) {
  return (
    <RouteGuard role="PARENT">
      {/* ChildProvider reads the ?child= param, so it needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <ChildProvider>
          <AppShell variant="parent" headerSlot={<HeaderChildSwitcher />}>
            {children}
          </AppShell>
        </ChildProvider>
      </Suspense>
    </RouteGuard>
  );
}
