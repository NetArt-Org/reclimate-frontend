"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Dialog as SheetPrimitive } from "radix-ui"
import { usePortalContainer } from "@/lib/portal-container"

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

/**
 * Bottom sheet from the design: drag handle, 28px top radius, slides up.
 * Positioned `absolute` inside the app screen (see PortalContainerContext).
 */
function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
  const container = usePortalContainer()
  return (
    <SheetPrimitive.Portal container={container}>
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className="absolute inset-0 z-40 bg-[rgba(20,24,22,.45)] data-[state=open]:animate-fade-in"
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        aria-describedby={undefined}
        className={cn(
          "absolute inset-x-0 bottom-0 z-41 flex max-h-[92%] flex-col gap-3 overflow-y-auto rounded-t-[28px] bg-surface px-5 pt-2.5 pb-[calc(30px+env(safe-area-inset-bottom))] text-ink no-scrollbar outline-none data-[state=open]:animate-sheet-up",
          className
        )}
        {...props}
      >
        <div className="mb-1.5 h-[5px] w-11 shrink-0 self-center rounded-full bg-line-strong" />
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-[21px] font-extrabold", className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("-mt-1 text-[15px] text-ink-muted", className)}
      {...props}
    />
  )
}

export { Sheet, SheetContent, SheetTitle, SheetDescription }
