import type { Metadata } from "next";
import { AdminSettingsView } from "@/features/admin/platform-views";

export const metadata: Metadata = { title: "Platform settings" };

export default function Page() {
  return <AdminSettingsView />;
}
