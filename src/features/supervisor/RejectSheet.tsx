"use client"

import { Icon } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import type { Dict } from "@/data/i18n"
import { cn } from "@/lib/utils"

export interface RejectSheetProps {
  t: Dict
  open: boolean
  reasons: { key: string; label: string; selected: boolean; onPick: () => void }[]
  note: string
  onNoteChange: (v: string) => void
  canConfirm: boolean
  onConfirm: () => void
  onClose: () => void
}

export function RejectSheet(p: RejectSheetProps) {
  const { t } = p
  return (
    <Sheet open={p.open} onOpenChange={(o) => !o && p.onClose()}>
      <SheetContent>
        <SheetTitle>{t.rejectTitle}</SheetTitle>
        <SheetDescription>{t.rejectSub}</SheetDescription>
        {p.reasons.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={r.onPick}
            aria-pressed={r.selected}
            className={cn(
              "flex min-h-[54px] cursor-pointer items-center gap-2.5 rounded-[14px] border-2 px-3.5 text-left transition-all",
              r.selected ? "border-danger bg-danger-soft text-danger-ink" : "border-line-option bg-surface text-ink"
            )}
          >
            <Icon name={r.selected ? "circle-check" : "circle"} size={22} />
            <span className="flex-1 text-base font-bold">{r.label}</span>
          </button>
        ))}
        <input
          value={p.note}
          onChange={(e) => p.onNoteChange(e.target.value)}
          placeholder={t.note}
          className="h-[54px] rounded-[14px] border-[1.5px] border-line-strong bg-surface px-3.5 text-base text-ink outline-none"
        />
        <Button variant={p.canConfirm ? "danger" : "disabled"} onClick={p.onConfirm}>
          {t.rejectBtn}
        </Button>
      </SheetContent>
    </Sheet>
  )
}
