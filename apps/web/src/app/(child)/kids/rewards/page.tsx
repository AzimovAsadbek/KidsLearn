import type { Metadata } from "next";
import { KidRewardsView } from "@/features/child/kid-profile";

export const metadata: Metadata = { title: "My rewards" };

export default function KidRewardsPage() {
  return <KidRewardsView />;
}
