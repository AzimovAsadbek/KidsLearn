import { Suspense } from "react";
import type { Metadata } from "next";
import { ChildrenView } from "@/features/parent/children-view";
import { SkeletonCard } from "@/components/ui/states";

export const metadata: Metadata = { title: "My children" };

export default function ChildrenPage() {
  return (
    // useSearchParams needs a Suspense boundary so the shell can stream first.
    <Suspense
      fallback={
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="h-72" />
          ))}
        </div>
      }
    >
      <ChildrenView />
    </Suspense>
  );
}
