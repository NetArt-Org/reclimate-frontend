import { Skeleton } from "@/components/ui/skeleton"

export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-[230px] rounded-3xl bg-[#E6DFD0]" />
      <Skeleton className="h-[200px] rounded-[22px] [animation-delay:.15s]" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[110px] [animation-delay:.3s]" />
        <Skeleton className="h-[110px] [animation-delay:.3s]" />
      </div>
    </div>
  )
}
