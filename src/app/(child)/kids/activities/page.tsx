import type { Metadata } from "next";
import { KidActivitiesView } from "@/features/child/kid-library";

export const metadata: Metadata = { title: "Activities" };

export default function KidActivitiesPage() {
  return <KidActivitiesView />;
}
