import type { Metadata } from "next";
import { AdminAnalyticsView } from "@/features/admin/platform-views";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return <AdminAnalyticsView />;
}
