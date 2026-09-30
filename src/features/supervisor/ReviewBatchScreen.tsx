"use client"

import { useState } from "react"
import { BackButton, Banner, Icon, MediaThumb, MediaView, MoistureStrip, ScreenWithFooter, StatGrid } from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Dict } from "@/data/i18n"
import type { MediaItem } from "@/types"

export interface ReviewBatchScreenProps {
  t: Dict
  title: string
  sub: string
  stats: { label: string; value: string }[]
  moisture: { val: string; wet: boolean }[]
  groups: { label: string; count: string; complete: boolean; kind: "photo" | "video"; items: MediaItem[] }[]
  onAccept: () => void
  onReject: () => void
  onBack: () => void
}

export function ReviewBatchScreen(p: ReviewBatchScreenProps) {
  const { t } = p
  const [viewing, setViewing] = useState<MediaItem | null>(null)
  return (
    <>
    <ScreenWithFooter
      footer={
        <>
          <Button variant="danger-outline" size="xl" className="flex-1" onClick={p.onReject}>
            <Icon name="x" size={22} />
            {t.reject}
          </Button>
          <Button variant="flat" size="xl" className="flex-[1.3]" onClick={p.onAccept}>
            <Icon name="check" size={22} />
            {t.accept}
          </Button>
        </>
      }
    >
      <BackButton label={t.back} onClick={p.onBack} />
      <div>
        <div className="text-2xl font-extrabold tracking-[-.4px]">{p.title}</div>
        <div className="mt-0.5 text-[15px] text-ink-muted">{p.sub}</div>
      </div>
      <Banner tone="info" icon="eye" className="items-center px-3.5 font-semibold">
        {t.checkAll}
      </Banner>
      <StatGrid items={p.stats} />
      <Card className="px-4 py-3.5">
        <div className="mb-2.5 text-base font-extrabold">{t.moisture}</div>
        <MoistureStrip readings={p.moisture} />
      </Card>
      {p.groups.map((g) => (
        <Card key={g.label} className="flex flex-col gap-2.5 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="text-base font-extrabold">{g.label}</div>
            <Badge tone={g.complete ? "success" : "warn"} size="lg">
              {g.count}
            </Badge>
          </div>
          {g.items.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {g.items.map((m) => (
                <button key={m.id} type="button" onClick={() => setViewing(m)} className="cursor-pointer active:scale-[.97]">
                  <MediaThumb kind={g.kind} media={m} />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-[15px] text-ink-muted">{t.noMedia}</div>
          )}
        </Card>
      ))}
    </ScreenWithFooter>
      {viewing && (
        <div className="absolute inset-0 z-50 flex animate-fade-in flex-col bg-night">
          <button
            type="button"
            onClick={() => setViewing(null)}
            aria-label={t.back}
            className="absolute top-11 left-4 z-10 flex size-12 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white"
          >
            <Icon name="x" size={24} />
          </button>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <MediaView item={viewing} controls className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      )}
    </>
  )
}
