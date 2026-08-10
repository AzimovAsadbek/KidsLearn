import { Skeleton, SkeletonChart, SkeletonStatGrid } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <SkeletonStatGrid />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );
}
