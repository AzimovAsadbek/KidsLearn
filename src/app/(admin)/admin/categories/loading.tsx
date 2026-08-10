import { Skeleton, SkeletonTable } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[100rem]" aria-busy="true">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}
