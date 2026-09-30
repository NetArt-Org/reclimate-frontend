"use client"

import { Icon } from "@/components/common"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export interface SiteSheetProps {
  open: boolean
  title: string
  sites: { name: string; selected: boolean; onPick: () => void }[]
  onClose: () => void
}

export function SiteSheet({ open, title, sites, onClose }: SiteSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetTitle>{title}</SheetTitle>
        {sites.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={s.onPick}
            className={cn(
              "flex min-h-[60px] cursor-pointer items-center gap-3 rounded-2xl border-2 px-3.5 text-left",
              s.selected ? "border-brand bg-brand-soft" : "border-line-option bg-surface"
            )}
          >
            <Icon name="map-pin" size={22} className="text-brand" />
            <span className="flex-1 text-[17px] font-bold">{s.name}</span>
            {s.selected && <Icon name="circle-check" size={24} className="text-brand" />}
          </button>
        ))}
      </SheetContent>
    </Sheet>
  )
}
