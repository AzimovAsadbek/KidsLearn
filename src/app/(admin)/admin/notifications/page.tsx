import type { Metadata } from "next";
import { NotificationsAdminView } from "@/features/admin/engagement-views";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return <NotificationsAdminView />;
}
