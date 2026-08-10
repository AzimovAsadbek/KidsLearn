import type { Metadata } from "next";
import { LessonLibraryView } from "@/features/catalog/library-view";

export const metadata: Metadata = { title: "Lessons" };

export default function LessonsPage() {
  return <LessonLibraryView />;
}
