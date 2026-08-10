import type { Metadata } from "next";
import { RewardsView } from "@/features/rewards/rewards-views";

export const metadata: Metadata = { title: "Rewards" };

export default function RewardsPage() {
  return <RewardsView />;
}
