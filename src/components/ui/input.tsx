import * as React from "react"
import { cn } from "@/lib/utils"

/** Bare input — sits inside a FieldShell which draws the border/icon/unit. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 flex-1 border-none bg-transparent text-[17px] font-bold text-ink outline-none placeholder:font-semibold placeholder:text-ink-subtle",
        className
      )}
      {...props}
    />
  )
}

export { Input }
