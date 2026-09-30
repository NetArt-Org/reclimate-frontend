"use client"

import { FieldLabel, FieldNote, FieldShell, Segmented } from "@/components/common"
import { Input } from "@/components/ui/input"
import type { WizardFieldView } from "../types"

export function NumberField({ f }: { f: Extract<WizardFieldView, { type: "number" }> }) {
  return (
    <>
      <FieldLabel className="text-[15px]">{f.label}</FieldLabel>
      <div className="flex items-stretch gap-2.5">
        <FieldShell
          size="lg"
          unit={f.unit}
          invalid={f.state === "invalid"}
          valid={f.state === "valid"}
          className="min-w-0 flex-1"
        >
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className="text-3xl font-extrabold"
          />
        </FieldShell>
        {f.units && (
          <Segmented
            direction="col"
            value={f.units.find((u) => u.selected)?.label ?? ""}
            onChange={(v) => f.units?.find((u) => u.label === v)?.onPick()}
            itemClassName="flex-1 min-w-16 rounded-xl"
            options={f.units.map((u) => ({ value: u.label, label: u.label }))}
          />
        )}
      </div>
      {f.hint && (
        <FieldNote icon="info">
          <span className="text-[15px]">{f.hint}</span>
        </FieldNote>
      )}
      {f.warn && (
        <FieldNote icon="triangle-alert" tone="danger">
          <span className="text-[15px]">{f.warn}</span>
        </FieldNote>
      )}
    </>
  )
}
