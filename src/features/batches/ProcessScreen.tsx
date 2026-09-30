"use client"

import { Banner, Icon, PageTitle, Screen, Segments, StatusBadge } from "@/components/common"
import { Button } from "@/components/ui/button"
import type { Dict } from "@/data/i18n"
import type { StatusView } from "../shared/types"

/** Colour of one day segment on a batch card. */
export type DaySegment = "done" | "failed" | "current" | "waiting" | "todo"

export interface BatchListItem {
  id: string
  title: string
  sub: string
  status: StatusView
  days: DaySegment[]
  dayText: string
  rejectedReason: string | null
  onOpen: () => void
  onFix: () => void
}

export const daySegmentClass: Record<DaySegment, string> = {
  done: "bg-green",
  failed: "bg-danger",
  current: "bg-info",
  waiting: "bg-amber",
  todo: "bg-line-option",
}

const dotClass: Record<StatusView["tone"], string> = {
  info: "bg-info shadow-[0_0_0_4px_var(--color-info-soft)]",
  warn: "bg-warn shadow-[0_0_0_4px_var(--color-warn-soft)]",
  success: "bg-success shadow-[0_0_0_4px_var(--color-success-soft)]",
  danger: "bg-danger shadow-[0_0_0_4px_var(--color-danger-soft)]",
}

export function ProcessScreen({ t, batches }: { t: Dict; batches: BatchListItem[] }) {
  return (
    <Screen className="gap-0">
      <PageTitle>{t.yourWork}</PageTitle>
      <p className="mt-1 mb-[18px] text-base text-ink-muted">{t.yourWorkSub}</p>
      {batches.map((b) => (
        <div key={b.id} className="flex gap-3">
          {/* timeline rail */}
          <div className="flex w-[18px] flex-none flex-col items-center">
            <div className={`mt-[22px] size-3.5 flex-none rounded-full ${dotClass[b.status.tone]}`} />
            <div className="mt-1.5 w-0.5 flex-1 bg-[#DDD5C4]" />
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={b.onOpen}
            onKeyDown={(e) => e.key === "Enter" && b.onOpen()}
            className="mb-3 flex min-w-0 flex-1 cursor-pointer flex-col gap-2.5 rounded-[20px] border border-line bg-surface p-4 active:scale-[.99]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[17px] font-extrabold">{b.title}</div>
                <div className="mt-0.5 text-sm text-ink-muted">{b.sub}</div>
              </div>
              <StatusBadge {...b.status} />
            </div>
            <Segments items={b.days.map((d) => ({ className: daySegmentClass[d] }))} />
            <div className="text-sm font-semibold text-ink-muted">{b.dayText}</div>
            {b.rejectedReason && (
              <>
                <Banner tone="danger" icon="message-square-warning">
                  {b.rejectedReason}
                </Banner>
                <Button
                  variant="danger"
                  size="md"
                  className="h-[50px] rounded-[14px] text-base"
                  onClick={(e) => {
                    e.stopPropagation()
                    b.onFix()
                  }}
                >
                  <Icon name="camera" size={20} />
                  {t.fix}
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </Screen>
  )
}
