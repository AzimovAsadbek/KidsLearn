import type { Metadata } from "next";
import { ParentDashboardView } from "@/features/parent/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <ParentDashboardView />;
}
