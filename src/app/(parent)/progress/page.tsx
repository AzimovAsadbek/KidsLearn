import type { Metadata } from "next";
import { ProgressView } from "@/features/parent/analytics-views";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return <ProgressView />;
}
