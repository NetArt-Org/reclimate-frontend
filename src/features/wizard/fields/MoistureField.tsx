"use client"

import { FieldLabel, FieldNote, Icon, MediaView } from "@/components/common"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { WizardFieldView } from "../types"
import { CountBadge } from "./MediaField"

export function MoistureField({ f }: { f: Extract<WizardFieldView, { type: "moist" }> }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <FieldLabel className="text-[15px]">{f.label}</FieldLabel>
        <CountBadge count={f.count} done={f.done} />
      </div>
      {f.rows.map((r) => (
        <div key={r.n} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-[34px] flex-none items-center justify-center rounded-full bg-ink font-extrabold text-white">
              {r.n}
            </div>
            <div
              className={cn(
                "flex h-[58px] min-w-0 flex-1 items-center gap-1.5 rounded-2xl border-2 px-3.5",
                r.wet ? "border-danger bg-danger-soft" : r.ok ? "border-green bg-surface" : "border-line-strong bg-surface"
              )}
            >
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0.0"
                value={r.value}
                onChange={(e) => r.onChange(e.target.value)}
                className="text-2xl font-extrabold"
              />
              <span className="text-lg font-extrabold text-ink-muted">%</span>
            </div>
            <button
              type="button"
              onClick={r.onSnap}
              aria-label="Meter photo"
              className={cn(
                "relative flex size-[58px] flex-none cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2",
                r.photo ? "border-green bg-green text-white" : "border-sage bg-brand-soft text-brand"
              )}
            >
              <Icon name={r.photo ? "image-check" : "camera"} size={26} />
              {r.photo && <MediaView item={r.photo} thumb className="absolute inset-0 size-full object-cover" />}
            </button>
          </div>
          {r.wet && (
            <div className="pl-11">
              <FieldNote icon="droplets" tone="danger">
                {f.tooWetLabel}
              </FieldNote>
            </div>
          )}
        </div>
      ))}
    </>
  )
}
