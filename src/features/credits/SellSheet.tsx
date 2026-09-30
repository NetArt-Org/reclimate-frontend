"use client"

import { Banner, FieldLabel, Icon } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import type { Dict } from "@/data/i18n"

export interface SellSheetProps {
  t: Dict
  open: boolean
  step: "form" | "done"
  unused: string
  value: string
  buyer: string
  belowGoal: boolean
  onSend: () => void
  onClose: () => void
}

export function SellSheet(p: SellSheetProps) {
  const { t } = p
  return (
    <Sheet open={p.open} onOpenChange={(o) => !o && p.onClose()}>
      <SheetContent>
        {p.step === "form" ? (
          <>
            <SheetTitle>{t.sellTitle}</SheetTitle>
            <div className="rounded-[18px] bg-brand-soft p-4 text-brand">
              <div className="text-sm font-bold">{t.sellAmount}</div>
              <div className="text-4xl font-extrabold tracking-[-1px]">{p.unused}</div>
              <div className="text-[15px]">≈ {p.value}</div>
            </div>
            <FieldLabel>{t.buyer}</FieldLabel>
            <div className="flex min-h-[60px] items-center gap-3 rounded-2xl border-2 border-brand bg-surface px-3.5">
              <Icon name="building-2" size={22} className="text-brand" />
              <div className="flex-1 text-[17px] font-bold">{p.buyer}</div>
              <Icon name="circle-check" size={22} className="text-brand" />
            </div>
            {p.belowGoal && (
              <Banner tone="warn" icon="info">
                {t.sellNote}
              </Banner>
            )}
            <Button variant="flat" onClick={p.onSend}>
              {t.sendReq}
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2.5 py-2.5 text-center">
              <div className="flex size-[76px] animate-pop items-center justify-center rounded-full bg-brand text-white">
                <Icon name="send" size={34} />
              </div>
              <SheetTitle className="text-[22px]">{t.reqSent}</SheetTitle>
              <div className="text-base text-ink-muted">{t.reqSentSub}</div>
            </div>
            <Button variant="flat" size="lg" onClick={p.onClose}>
              OK
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
