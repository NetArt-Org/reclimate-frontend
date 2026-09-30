"use client"

import { BackButton, Icon, IconTile, MoistureStrip, Screen, StatGrid, StatusBadge, type IconName } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Dict } from "@/data/i18n"
import { cn } from "@/lib/utils"
import type { StatusView } from "../shared/types"

export type DayCardState = "done" | "waiting" | "current" | "fix" | "locked"

export interface BatchDayCard {
  n: string
  name: string
  icon: IconName
  state: DayCardState
  stateText: string
  action?: { label: string; onPress: () => void }
}

export interface BatchDetailScreenProps {
  t: Dict
  title: string
  id: string
  status: StatusView
  rejected: { reason: string; onFix: () => void } | null
  stats: { label: string; value: string }[]
  days: BatchDayCard[]
  moisture: { val: string; wet: boolean }[] | null
  onBack: () => void
}

const dayStyle: Record<DayCardState, { card: string; tile: "success" | "warn" | "info" | "danger" | "neutral"; text: string }> = {
  done: { card: "border-line", tile: "success", text: "text-success" },
  waiting: { card: "border-[#F1D9A6]", tile: "warn", text: "text-warn" },
  current: { card: "border-info", tile: "info", text: "text-info" },
  fix: { card: "border-[#E9B9B0]", tile: "danger", text: "text-danger" },
  locked: { card: "border-line", tile: "neutral", text: "text-ink-subtle" },
}

export function BatchDetailScreen(p: BatchDetailScreenProps) {
  const { t } = p
  return (
    <Screen sub className="gap-3.5">
      <BackButton label={t.back} onClick={p.onBack} />
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <div className="text-2xl font-extrabold tracking-[-.4px]">{p.title}</div>
          <div className="mt-0.5 text-[15px] text-ink-muted">{p.id}</div>
        </div>
        <StatusBadge {...p.status} size="lg" />
      </div>

      {p.rejected && (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-danger-soft p-3.5 text-base leading-[1.4] text-danger-ink">
          <div className="flex gap-2">
            <Icon name="message-square-warning" size={22} className="flex-none" />
            <span>{p.rejected.reason}</span>
          </div>
          <Button variant="danger" size="md" className="rounded-[14px]" onClick={p.rejected.onFix}>
            <Icon name="camera" size={20} />
            {t.fix}
          </Button>
        </div>
      )}

      <StatGrid items={p.stats} />

      <div className="flex flex-col gap-2.5">
        {p.days.map((d) => {
          const st = dayStyle[d.state]
          return (
            <Card key={d.n} className={cn("flex flex-col gap-3 border-2 p-3.5", st.card)}>
              <div className="flex items-center gap-3">
                <IconTile icon={d.icon} tone={st.tile} size={48} iconSize={24} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-extrabold tracking-[.5px] text-ink-muted uppercase">{d.n}</div>
                  <div className="text-[17px] font-extrabold">{d.name}</div>
                </div>
                <div className={cn("max-w-[120px] text-right text-[13px] font-extrabold", st.text)}>{d.stateText}</div>
              </div>
              {d.action && (
                <Button variant="flat" size="md" className="rounded-[14px]" onClick={d.action.onPress}>
                  {d.action.label}
                  <Icon name="arrow-right" size={20} />
                </Button>
              )}
            </Card>
          )
        })}
      </div>

      {p.moisture && (
        <Card className="px-4 py-3.5">
          <div className="mb-2.5 text-base font-extrabold">{t.moisture}</div>
          <MoistureStrip readings={p.moisture} />
        </Card>
      )}
    </Screen>
  )
}
