import type { Metadata } from "next";
import { LeaderboardView } from "@/features/rewards/rewards-views";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  return <LeaderboardView />;
}
