import type { Metadata } from "next";
import { RewardsAdminView } from "@/features/admin/engagement-views";

export const metadata: Metadata = { title: "Rewards" };

export default function Page() {
  return <RewardsAdminView />;
}
