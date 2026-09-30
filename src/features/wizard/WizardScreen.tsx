"use client"

import { FooterBar, Icon, ProgressChip, Segments } from "@/components/common"
import { Button } from "@/components/ui/button"
import type { Dict } from "@/data/i18n"
import { cn } from "@/lib/utils"
import { ChoiceField } from "./fields/ChoiceField"
import { MediaField } from "./fields/MediaField"
import { MoistureField } from "./fields/MoistureField"
import { NumberField } from "./fields/NumberField"
import { LocationField, TimerField } from "./fields/TimerField"
import type { WizardFieldView, WizardViewModel } from "./types"

const segClass = { done: "bg-green", current: "bg-brand", reached: "bg-sage", todo: "bg-line-option" } as const

function Field({ t, f }: { t: Dict; f: WizardFieldView }) {
  switch (f.type) {
    case "choice":
      return <ChoiceField f={f} />
    case "number":
      return <NumberField f={f} />
    case "media":
      return <MediaField f={f} />
    case "moist":
      return <MoistureField f={f} />
    case "timer":
      return <TimerField t={t} f={f} />
    case "loc":
      return <LocationField t={t} f={f} />
  }
}

/** One step of a batch day: illustration, instructions, fields, sticky "Next". */
export function WizardScreen({ t, wz }: { t: Dict; wz: WizardViewModel }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-cream">
      <div className="flex flex-none items-center gap-1.5 pt-0.5 pr-3 pb-2.5 pl-2">
        <Button variant="ghost" size="pill" className="h-12 gap-1 px-2.5 text-[15px]" onClick={wz.onExit}>
          <Icon name="x" size={24} />
          {t.saveExit}
        </Button>
        <div className="flex-1 text-center text-base font-extrabold">{wz.dayTitle}</div>
        <div
          className={cn(
            "flex items-center gap-1 pr-1.5 text-[13px] font-bold transition-colors duration-300",
            wz.saving ? "text-info" : "text-success"
          )}
        >
          <Icon name={wz.saving ? "loader-circle" : "cloud-check"} size={16} className={cn(wz.saving && "animate-spin")} />
          {wz.saving ? t.saving : t.saved}
        </div>
      </div>

      <div className="flex-none px-5">
        <Segments gap={5} height={8} items={wz.segments.map((s) => ({ className: segClass[s.state], onClick: s.onClick }))} />
        <div className="mt-2 flex justify-between text-sm font-bold text-ink-muted">
          <span>{wz.stepText}</span>
          <span>{wz.batchLabel}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <div key={wz.stepKey} className="flex animate-step-in-slow flex-col gap-4 px-5 pt-3.5 pb-6">
          {wz.burnTime && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-ink px-3.5 py-3 text-white">
              <Icon name="flame" size={22} className="text-flame" />
              <div className="flex-1 text-[15px] font-bold">{t.burning}</div>
              <div className="text-xl font-extrabold tracking-[.5px] tabular-nums">{wz.burnTime}</div>
            </div>
          )}
          <div className="flex h-[140px] items-center justify-center rounded-[20px] border border-[#E1D8C4] bg-stripe-illustration">
            <div className="rounded-lg bg-[#F7F2E7] px-2.5 py-1.5 font-mono text-xs text-[#7A6A52]">
              illustration: {wz.illustration}
            </div>
          </div>
          <div>
            <h1 className="text-[25px] leading-[1.2] font-extrabold tracking-[-.5px] text-pretty">{wz.title}</h1>
            <p className="mt-1.5 text-[17px] leading-[1.45] text-pretty text-ink-2">{wz.instructions}</p>
          </div>
          {wz.fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-2.5">
              <Field t={t} f={f} />
            </div>
          ))}
        </div>
      </div>

      <FooterBar className="flex-col">
        <div className="flex flex-wrap gap-1.5">
          {wz.chips.map((c) => (
            <ProgressChip key={c.label} label={c.label} done={c.done} small />
          ))}
        </div>
        {wz.missing && <div className="text-sm leading-[1.35] font-semibold text-warn-ink">{wz.missing}</div>}
        <Button size="xl" variant={wz.ready ? "flat" : "disabled"} className="gap-2.5" onClick={wz.onDone}>
          <Icon name={wz.doneIcon} size={22} />
          {wz.doneLabel}
        </Button>
      </FooterBar>
    </div>
  )
}
