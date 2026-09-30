"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/**
 * Design-system button. Variants map 1:1 to the Artisan Pro design:
 * big, high-contrast, thumb-friendly targets for field workers.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border-0 font-extrabold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-[.98] disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-brand text-white shadow-[0_6px_14px_rgba(31,90,61,.3)] active:bg-brand-dark",
        flat: "bg-brand text-white active:bg-brand-dark",
        outline: "border-2 border-brand bg-transparent text-brand",
        dashed: "border-2 border-dashed border-sage-line bg-transparent text-brand",
        soft: "bg-brand-soft text-brand",
        danger: "bg-danger text-white",
        "danger-outline": "border-2 border-danger bg-surface text-danger",
        "danger-soft": "border-[1.5px] border-danger-line bg-surface text-danger",
        neutral: "border-[1.5px] border-line-strong bg-surface text-ink",
        ghost: "bg-transparent text-ink",
        link: "bg-transparent text-brand",
        lime: "bg-lime text-brand-dark",
        "ghost-light": "border-2 border-white/40 bg-transparent text-white",
        disabled: "bg-disabled text-disabled-ink shadow-none",
      },
      size: {
        default: "h-[58px] rounded-[18px] px-5 text-lg",
        xl: "h-[60px] rounded-[18px] px-5 text-lg [&_svg:not([class*='size-'])]:size-[22px]",
        lg: "h-14 rounded-[18px] px-5 text-[17px]",
        md: "h-[52px] rounded-2xl px-4 text-[17px]",
        sm: "h-11 rounded-xl px-3.5 text-[15px]",
        pill: "h-10 rounded-full px-3.5 text-sm font-bold",
        icon: "size-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
