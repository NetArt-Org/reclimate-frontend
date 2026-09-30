import * as React from "react"
import { cn } from "@/lib/utils"

/** Warm off-white surface card used everywhere in the design. */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("rounded-[20px] border border-line bg-surface text-card-foreground", className)}
      {...props}
    />
  )
}

/** List container with 16px side padding; children draw their own dividers. */
function CardList({ className, ...props }: React.ComponentProps<"div">) {
  return <Card className={cn("px-4 py-1", className)} {...props} />
}

export { Card, CardList }
