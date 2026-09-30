"use client"

import { Icon, IconTile, ProgressChip } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Dict } from "@/data/i18n"
import type { TodayTask } from "../types"

export function TodayTaskCard({ t, task }: { t: Dict; task: TodayTask }) {
  return (
    <Card className="flex flex-col gap-3.5 rounded-[22px] p-[18px] shadow-[0_2px_12px_rgba(30,35,32,.05)]">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-extrabold tracking-[.8px] text-ink-muted uppercase">{t.today}</div>
        <div className="rounded-[10px] bg-info-soft px-2.5 py-[5px] text-[13px] font-bold text-info">{task.day}</div>
      </div>
      <div className="flex items-center gap-3.5">
        <IconTile icon={task.icon} size={56} iconSize={28} radius="rounded-2xl" />
        <div className="min-w-0">
          <div className="text-[19px] leading-[1.25] font-extrabold text-pretty">{task.title}</div>
          <div className="mt-[3px] text-sm text-ink-muted">{task.sub}</div>
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex justify-between text-sm font-semibold text-ink-muted">
          <span>{task.stepText}</span>
          <span>{task.burn}</span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-track">
          <div className="h-full animate-grow rounded bg-info" style={{ width: `${task.pct}%` }} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {task.chips.map((c) => (
          <ProgressChip key={c.label} label={c.label} done={c.done} />
        ))}
      </div>
      <Button onClick={task.onContinue} className="gap-2.5">
        {t.cont}
        <Icon name="arrow-right" size={22} />
      </Button>
    </Card>
  )
}

export function AllDoneCard({ t, onNewBatch }: { t: Dict; onNewBatch: () => void }) {
  return (
    <Card className="flex flex-col items-start gap-3 rounded-[22px] p-5">
      <div className="flex size-[52px] items-center justify-center rounded-full bg-success-soft text-success">
        <Icon name="check" size={28} />
      </div>
      <div className="text-[19px] font-extrabold">{t.allDone}</div>
      <div className="text-base text-ink-muted">{t.allDoneSub}</div>
      <Button variant="outline" size="md" onClick={onNewBatch} className="h-[54px]">
        <Icon name="plus" size={20} />
        {t.newBatch}
      </Button>
    </Card>
  )
}

export function MixReadyCard({ label, title, sub, onOpen }: { label: string; title: string; sub: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-line bg-surface px-4 py-3.5 text-left active:scale-[.99]"
    >
      <IconTile icon="cooking-pot" size={48} iconSize={24} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-extrabold tracking-[.7px] text-success uppercase">{label}</div>
        <div className="mt-0.5 text-[17px] font-extrabold">{title}</div>
        <div className="text-sm text-ink-muted">{sub}</div>
      </div>
      <div className="flex size-11 flex-none items-center justify-center rounded-full bg-brand text-white">
        <Icon name="arrow-right" size={20} />
      </div>
    </button>
  )
}
