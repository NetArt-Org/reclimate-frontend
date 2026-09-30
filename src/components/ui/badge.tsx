"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/** Status pill used for batch states, counters and feedback tags. */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-[5px] font-extrabold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:shrink-0",
  {
    variants: {
      tone: {
        info: "bg-info-soft text-info",
        warn: "bg-warn-soft text-warn",
        success: "bg-success-soft text-success",
        danger: "bg-danger-soft text-danger",
        neutral: "bg-track text-ink-muted",
        clay: "bg-clay-soft text-[#6B4428]",
        brand: "bg-brand-soft text-brand",
      },
      size: {
        sm: "rounded-lg px-2 py-1 text-xs [&>svg]:size-3.5",
        default: "rounded-[9px] px-[9px] py-[5px] text-xs [&>svg]:size-3.5",
        lg: "rounded-[10px] px-2.5 py-1.5 text-[13px] [&>svg]:size-[15px]",
        count: "rounded-[10px] px-2.5 py-1 text-sm",
        chip: "h-8 rounded-2xl px-3 text-sm font-bold [&>svg]:size-4",
        "chip-sm": "h-[30px] rounded-[15px] px-2.5 text-[13px] [&>svg]:size-[15px]",
      },
    },
    defaultVariants: { tone: "neutral", size: "default" },
  }
)

function Badge({
  className,
  tone,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"
  return <Comp data-slot="badge" className={cn(badgeVariants({ tone, size }), className)} {...props} />
}

export { Badge, badgeVariants }
