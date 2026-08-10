import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lessonById, lessons } from "@/data/lessons";
import { LessonPlayer } from "@/features/lessons/lesson-player";

export function generateStaticParams() {
  return lessons.map((lesson) => ({ id: lesson.id }));
}

export async function generateMetadata({ params }: PageProps<"/kids/lessons/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: lessonById.get(id)?.title ?? "Lesson" };
}

export default async function LessonPage({ params }: PageProps<"/kids/lessons/[id]">) {
  const { id } = await params;
  const lesson = lessonById.get(id);
  if (!lesson) notFound();

  return <LessonPlayer lesson={lesson} />;
}
