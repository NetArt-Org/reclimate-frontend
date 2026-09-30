"use client"

import { EmptyState, Icon, MediaThumb, Screen, SectionTitle } from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { Dict } from "@/data/i18n"
import type { MediaItem } from "@/types"
import { GreetingHeader, type GreetingHeaderProps } from "../shared/GreetingHeader"

export interface ReviewQueueItem {
  id: string
  title: string
  sub: string
  worker: string
  moisture: string
  /** First few captures, as a preview. */
  media: MediaItem[]
  extraMedia: number
  onReview: () => void
}

export interface ReviewQueueScreenProps {
  t: Dict
  header: GreetingHeaderProps
  /** First load from the backend is still in flight. */
  loading: boolean
  counts: { toReview: number; approved: number; rejected: number }
  queue: ReviewQueueItem[]
}

export function ReviewQueueScreen({ t, header, loading, counts, queue }: ReviewQueueScreenProps) {
  return (
    <Screen>
      <GreetingHeader {...header} />
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-[18px] bg-warn-soft p-3.5">
          <div className="text-3xl font-extrabold text-warn">{counts.toReview}</div>
          <div className="text-[13px] font-bold text-warn-ink">{t.toReview}</div>
        </div>
        <div className="rounded-[18px] bg-success-soft p-3.5">
          <div className="text-3xl font-extrabold text-success">{counts.approved}</div>
          <div className="text-[13px] font-bold text-success-ink">{t.approved}</div>
        </div>
        <div className="rounded-[18px] bg-danger-soft p-3.5">
          <div className="text-3xl font-extrabold text-danger">{counts.rejected}</div>
          <div className="text-[13px] font-bold text-danger-ink">{t.rejected}</div>
        </div>
      </div>

      <SectionTitle className="mt-1">{t.reviewTitle}</SectionTitle>
      {queue.length === 0 &&
        (loading ? (
          <Skeleton className="h-[190px] rounded-[22px]" />
        ) : (
          <EmptyState icon="check-check" title={t.reviewEmpty} sub={t.reviewEmptySub} />
        ))}
      {queue.map((r) => (
        <Card key={r.id} className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[17px] font-extrabold">{r.title}</div>
              <div className="mt-0.5 text-sm text-ink-muted">{r.sub}</div>
            </div>
            <Badge tone="warn">
              <Icon name="hourglass" />
              {t.waiting}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-2">
            <Icon name="user-round" size={16} />
            {r.worker}
          </div>
          {r.media.length > 0 && (
            <div className="grid grid-cols-5 gap-1.5">
              {r.media.map((m) => (
                <MediaThumb key={m.id} kind={m.kind} media={m} plain className="rounded-[10px]" />
              ))}
              {r.extraMedia > 0 && (
                <div className="flex aspect-square items-center justify-center rounded-[10px] bg-track text-[15px] font-extrabold text-ink-2">
                  +{r.extraMedia}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
            <Icon name="droplets" size={16} className="text-teal" />
            {r.moisture}
          </div>
          <Button variant="flat" size="md" onClick={r.onReview}>
            {t.review}
            <Icon name="arrow-right" size={20} />
          </Button>
        </Card>
      ))}
    </Screen>
  )
}
