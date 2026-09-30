"use client"

import { FieldLabel, Icon, OptionCard } from "@/components/common"
import { Button } from "@/components/ui/button"
import type { WizardFieldView } from "../types"

export function ChoiceField({ f }: { f: Extract<WizardFieldView, { type: "choice" }> }) {
  return (
    <>
      <FieldLabel className="text-[15px]">{f.label}</FieldLabel>
      {f.options.map((o) => (
        <OptionCard key={o.value} icon={o.icon} title={o.label} sub={o.sub} selected={o.selected} onClick={o.onPick} />
      ))}
      {f.add && (
        <Button variant="dashed" size="lg" className="min-h-14 text-base" onClick={f.add.onPress}>
          <Icon name="plus" size={20} />
          {f.add.label}
        </Button>
      )}
    </>
  )
}
