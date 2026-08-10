"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/provider";
import { useSelectedChild } from "@/components/providers/child-provider";
import { fetchLesson, queryKeys } from "@/lib/api/queries";
import { ApiError } from "@/lib/api/client";
import { KidLoading } from "@/components/kid/kid-loading";
import { KidRouteError } from "@/components/kid/kid-error";
import { LessonPlayer } from "./lesson-player";

/**
 * Resolves the lesson (with its content blocks, in the active locale) before
 * handing off to the player. Passing childId attaches the child's progress and
 * lets the API enforce the age band.
 */
export function LessonPlayerLoader({ idOrSlug }: { idOrSlug: string }) {
  const { childId, loading: childLoading } = useSelectedChild();
  const { locale } = useI18n();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKeys.lesson(idOrSlug, childId ?? undefined), locale],
    queryFn: () => fetchLesson(idOrSlug, childId ?? undefined, locale),
    enabled: !childLoading,
  });

  if (childLoading || isLoading) return <KidLoading />;

  if (error || !data) {
    return (
      <KidRouteError
        error={error instanceof ApiError ? error : new Error("Lesson not found")}
        reset={() => void refetch()}
      />
    );
  }

  return <LessonPlayer lesson={data} />;
}
