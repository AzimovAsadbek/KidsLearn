import type { Metadata } from "next";
import { LessonPlayerLoader } from "@/features/lessons/lesson-player-loader";

export const metadata: Metadata = { title: "Lesson" };

export default async function LessonPage({ params }: PageProps<"/kids/lessons/[id]">) {
  const { id } = await params;
  return <LessonPlayerLoader idOrSlug={id} />;
}
