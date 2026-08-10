import type { Metadata } from "next";
import { LeaderboardAdminView } from "@/features/admin/engagement-views";

export const metadata: Metadata = { title: "Leaderboard" };

export default function Page() {
  return <LeaderboardAdminView />;
}
