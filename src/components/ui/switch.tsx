"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Switch as SwitchPrimitive } from "radix-ui"

/** 52×32 toggle from the design (brand green when on, warm grey when off). */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 data-[state=checked]:bg-brand data-[state=unchecked]:bg-toggle-off",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[26px] translate-x-[3px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.25)] transition-transform duration-200 data-[state=checked]:translate-x-[23px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
