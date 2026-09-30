"use client"

import { Icon, IconTile, ListRow, type IconName } from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { CardList } from "@/components/ui/card"
import type { FeedbackItem } from "../types"

export function FeedbackList({ items }: { items: FeedbackItem[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((f, i) => (
        <button
          key={i}
          type="button"
          onClick={f.onOpen}
          className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-line bg-surface p-3.5 text-left active:scale-[.99]"
        >
          <IconTile icon={f.status.icon} tone={f.status.tone} size={40} iconSize={22} radius="rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-base font-bold">{f.title}</div>
              <Badge tone={f.status.tone} size="sm">
                {f.status.label}
              </Badge>
            </div>
            <div className="mt-[3px] text-sm text-pretty text-ink-muted">{f.sub}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

export function ActivityList({ items }: { items: { icon: IconName; title: string; time: string }[] }) {
  return (
    <CardList>
      {items.map((a, i) => (
        <ListRow
          key={i}
          leading={
            <div className="flex size-9 flex-none items-center justify-center rounded-full bg-clay-soft text-clay">
              <Icon name={a.icon} size={18} />
            </div>
          }
          title={a.title}
          trailing={<div className="flex-none text-[13px] text-ink-muted">{a.time}</div>}
        />
      ))}
    </CardList>
  )
}
