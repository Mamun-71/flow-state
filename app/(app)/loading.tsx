import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-1 h-9 w-56" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl sm:w-64" />
      </div>
      <Skeleton className="mt-6 h-16 w-full rounded-2xl" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid gap-2.5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
