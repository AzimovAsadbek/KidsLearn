import type { Metadata } from "next";
import { AchievementsAdminView } from "@/features/admin/engagement-views";

export const metadata: Metadata = { title: "Achievements" };

export default function Page() {
  return <AchievementsAdminView />;
}
