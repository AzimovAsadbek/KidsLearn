"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchChild, queryKeys } from "@/lib/api/queries";
import { ApiError } from "@/lib/api/client";
import { ErrorState, SkeletonCard, SkeletonStatGrid } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { ChildProfileView } from "./child-profile-view";

/**
 * Resolves the child by id. A child that belongs to another parent returns 404
 * from the API, so this renders "not found" rather than leaking its existence.
 */
export function ChildProfileLoader({ childId }: { childId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.child(childId),
    queryFn: () => fetchChild(childId),
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[95rem] space-y-5" aria-busy="true">
        <SkeletonCard className="h-56" />
        <SkeletonStatGrid />
      </div>
    );
  }

  if (error || !data) {
    const notFound = error instanceof ApiError && error.isNotFound;
    return (
      <ErrorState
        title={notFound ? "We couldn't find that child" : "Something went wrong"}
        body={notFound ? "The profile may have been removed." : "Please try again in a moment."}
        action={<ButtonLink href="/children">Back to my children</ButtonLink>}
      />
    );
  }

  return <ChildProfileView child={data} />;
}
