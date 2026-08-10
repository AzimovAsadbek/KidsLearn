import { AppShell } from "@/components/layout/app-shell";
import { HeaderChildSwitcher } from "@/features/parent/child-switcher";

export default function ParentLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell variant="parent" headerSlot={<HeaderChildSwitcher />}>
      {children}
    </AppShell>
  );
}
