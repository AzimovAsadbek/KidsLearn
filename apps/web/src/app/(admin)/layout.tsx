import { AppShell } from "@/components/layout/app-shell";
import { RouteGuard } from "@/components/providers/route-guard";
import { AdminHeaderSlot } from "@/features/admin/admin-header";

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <RouteGuard role="ADMIN">
      {/* The admin IA is too deep for a five-item bottom bar; the drawer is the
          mobile navigation here. */}
      <AppShell variant="admin" mobileBar={false} headerSlot={<AdminHeaderSlot />}>
        {children}
      </AppShell>
    </RouteGuard>
  );
}
