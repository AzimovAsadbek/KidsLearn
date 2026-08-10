import { Skeleton, SkeletonCard, SkeletonChart, SkeletonStatGrid } from "@/components/ui/states";

/** Shape-matched dashboard placeholder — the layout never jumps on load. */
export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-32 rounded-full" />
          ))}
        </div>
      </div>

      <SkeletonStatGrid />

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr_1.1fr]">
        <SkeletonChart />
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <SkeletonCard className="h-80" />
        <div className="space-y-5">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
