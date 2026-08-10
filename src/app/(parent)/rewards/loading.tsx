import { Skeleton, SkeletonCard } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[95rem]" aria-busy="true">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} className="h-52" />
        ))}
      </div>
    </div>
  );
}
