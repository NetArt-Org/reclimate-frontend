"use client"

import { FieldLabel, Icon, MediaView } from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { WizardFieldView } from "../types"

export function CountBadge({ count, done }: { count: string; done: boolean }) {
  return (
    <Badge tone={done ? "success" : "clay"} size="count">
      {count}
    </Badge>
  )
}

export function MediaField({ f }: { f: Extract<WizardFieldView, { type: "media" }> }) {
  const video = f.kind === "video"
  return (
    <>
      <div className="flex items-center justify-between">
        <FieldLabel className="text-[15px]">{f.label}</FieldLabel>
        <CountBadge count={f.count} done={f.done} />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {f.slots.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={s.onOpen}
            disabled={!!s.media}
            className="relative aspect-square cursor-pointer overflow-hidden rounded-2xl disabled:cursor-default"
          >
            {s.media ? (
              <div
                className={cn(
                  "absolute inset-0 flex animate-pop items-center justify-center",
                  video ? "bg-stripe-video" : "bg-stripe-photo"
                )}
              >
                <MediaView item={s.media} thumb className="absolute inset-0 size-full object-cover" />
                {video && (
                  <span className="relative flex size-9 items-center justify-center rounded-full bg-white/90 text-ink">
                    <Icon name="play" size={18} />
                  </span>
                )}
                <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-green text-white">
                  <Icon name="check" size={15} />
                </span>
                {s.pending && (
                  <span className="absolute bottom-1.5 left-1.5 flex h-[22px] items-center gap-1 rounded-[11px] bg-[rgba(30,35,32,.8)] px-1.5 text-gold">
                    <Icon name="cloud-off" size={12} />
                  </span>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed",
                  s.next ? "border-brand bg-brand-soft text-brand" : "border-[#CFC6B3] text-ink-subtle"
                )}
              >
                <Icon name={video ? "video" : "camera"} size={28} />
                <span className="text-xs font-bold">{s.label}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </>
  )
}
