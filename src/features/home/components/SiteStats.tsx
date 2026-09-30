"use client"

import { Icon } from "@/components/common"
import { Card } from "@/components/ui/card"
import type { Dict } from "@/data/i18n"
import { cn } from "@/lib/utils"
import type { SiteNumbers } from "../types"

const splitColor = { approved: "bg-green", waiting: "bg-amber", rejected: "bg-red" } as const

export function SiteStats({ t, numbers }: { t: Dict; numbers: SiteNumbers }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <Icon name="wheat" size={24} className="text-clay" />
          <div className="mt-2 text-[26px] font-extrabold tracking-[-.5px]">
            {numbers.biomass} <span className="text-[15px] text-ink-muted">t</span>
          </div>
          <div className="text-sm font-semibold text-ink-muted">{t.biomass}</div>
        </Card>
        <Card className="p-4">
          <Icon name="flame" size={24} className="text-ink" />
          <div className="mt-2 text-[26px] font-extrabold tracking-[-.5px]">
            {numbers.biochar} <span className="text-[15px] text-ink-muted">m³</span>
          </div>
          <div className="text-sm font-semibold text-ink-muted">{t.biochar}</div>
        </Card>
      </div>

      <Card className="flex flex-col gap-3.5 p-4">
        <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-[7px]">
          {numbers.split.map((s) => (
            <div key={s.tone} className={splitColor[s.tone]} style={{ width: `${s.pct}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {numbers.split.map((s) => (
            <div key={s.tone}>
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-ink-muted">
                <span className={cn("size-2.5 rounded-full", splitColor[s.tone])} />
                {s.label}
              </div>
              <div className="mt-0.5 text-[19px] font-extrabold">
                {s.value} <span className="text-[13px] text-ink-muted">m³</span>
              </div>
            </div>
          ))}
        </div>
        <div className="h-px bg-track" />
        <div className="grid grid-cols-3 gap-2">
          {numbers.flow.map((f) => (
            <div key={f.label} className="flex flex-col gap-1">
              <Icon name={f.icon} size={20} className="text-clay" />
              <div className="text-base font-extrabold">{f.value}</div>
              <div className="text-[13px] font-semibold text-ink-muted">{f.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

export function TrendChart({
  title,
  bars,
  start,
  end,
}: {
  title: string
  bars: { h: number; today: boolean }[]
  start: string
  end: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[15px] font-bold">{title}</div>
        <div className="text-[13px] font-semibold text-ink-muted">m³</div>
      </div>
      <div className="mt-3.5 flex h-24 items-end gap-[3px]" role="img" aria-label={title}>
        {bars.map((b, i) => (
          <div
            key={i}
            className={cn("min-h-[3px] flex-1 animate-rise rounded-[3px_3px_1px_1px]", b.today ? "bg-teal" : "bg-sage")}
            style={{ height: `${b.h}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs font-semibold text-ink-muted">
        <span>{start}</span>
        <span>{end}</span>
      </div>
    </Card>
  )
}
