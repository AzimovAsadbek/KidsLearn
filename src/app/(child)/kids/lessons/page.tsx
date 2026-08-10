import type { Metadata } from "next";
import { KidLessonsView } from "@/features/child/kid-library";

export const metadata: Metadata = { title: "Lessons" };

export default function KidLessonsPage() {
  return <KidLessonsView />;
}
