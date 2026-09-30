"use client"

import { Icon, IconTile, type IconName } from "@/components/common"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export interface StartOption {
  key: string
  icon: IconName
  title: string
  sub: string
  primary: boolean
  onPress: () => void
}

/** "What do you want to do?" — continue today's task, start a batch, mix & pack. */
export function StartSheet({
  open,
  title,
  options,
  onClose,
}: {
  open: boolean
  title: string
  options: StartOption[]
  onClose: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetTitle>{title}</SheetTitle>
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={o.onPress}
            className={cn(
              "flex min-h-[72px] cursor-pointer items-center gap-3.5 rounded-[18px] border-2 px-3.5 py-3 text-left active:scale-[.98]",
              o.primary ? "border-brand bg-brand-soft" : "border-line-option bg-surface"
            )}
          >
            <IconTile icon={o.icon} tone={o.primary ? "solid" : "clay"} size={48} iconSize={24} />
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-extrabold">{o.title}</div>
              <div className="text-sm text-ink-muted">{o.sub}</div>
            </div>
            <Icon name="chevron-right" size={22} className="text-ink-subtle" />
          </button>
        ))}
      </SheetContent>
    </Sheet>
  )
}
