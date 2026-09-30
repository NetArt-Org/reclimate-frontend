import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("animate-soft-pulse rounded-[20px] bg-[#E9E3D5]", className)} {...props} />
}

export { Skeleton }
