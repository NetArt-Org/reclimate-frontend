"use client"

import { PageTitle, Screen, StatusBadge } from "@/components/common"
import { Card } from "@/components/ui/card"
import type { Dict } from "@/data/i18n"
import type { StatusView } from "../shared/types"

export interface ReviewedItem {
  id: string
  title: string
  sub: string
  status: StatusView
  reason: string | null
}

export function ReviewedScreen({ t, items }: { t: Dict; items: ReviewedItem[] }) {
  return (
    <Screen className="gap-3">
      <div className="mb-1.5">
        <PageTitle>{t.reviewed}</PageTitle>
      </div>
      {items.map((h) => (
        <Card key={h.id} className="flex flex-col gap-2.5 rounded-[18px] px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-base font-extrabold">{h.title}</div>
              <div className="mt-0.5 text-sm text-ink-muted">{h.sub}</div>
            </div>
            <StatusBadge {...h.status} />
          </div>
          {h.reason && (
            <div className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm leading-[1.4] text-danger-ink">{h.reason}</div>
          )}
        </Card>
      ))}
    </Screen>
  )
}
