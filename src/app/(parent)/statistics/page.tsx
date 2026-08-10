import type { Metadata } from "next";
import { StatisticsView } from "@/features/parent/analytics-views";

export const metadata: Metadata = { title: "Statistics" };

export default function StatisticsPage() {
  return <StatisticsView />;
}
