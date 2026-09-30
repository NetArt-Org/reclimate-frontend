"use client"

import { FieldLabel, Icon } from "@/components/common"
import type { Dict } from "@/data/i18n"
import type { WizardFieldView } from "../types"

export function TimerField({ t, f }: { t: Dict; f: Extract<WizardFieldView, { type: "timer" }> }) {
  if (!f.started)
    return (
      <button
        type="button"
        onClick={f.onStart}
        className="flex h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl bg-clay text-[22px] font-extrabold text-white shadow-[0_10px_22px_rgba(138,90,60,.35)] active:scale-[.98]"
      >
        <Icon name="flame" size={40} />
        {t.startBurn}
      </button>
    )
  return (
    <div className="flex animate-pop flex-col items-center gap-1.5 rounded-3xl bg-ink p-[22px] text-white">
      <Icon name="flame" size={34} className="text-flame" />
      <div className="text-[42px] font-extrabold tracking-[1px] tabular-nums">{f.elapsed}</div>
      <div className="text-[15px] text-[#C9CFCB]">
        {t.startedAt} {f.startedAt}
      </div>
    </div>
  )
}

export function LocationField({ t, f }: { t: Dict; f: Extract<WizardFieldView, { type: "loc" }> }) {
  return (
    <>
      <FieldLabel className="text-[15px]">{f.label}</FieldLabel>
      {f.coords ? (
        <div className="flex min-h-[60px] animate-pop items-center gap-2.5 rounded-[18px] border-2 border-green bg-success-soft px-3.5 py-2.5 text-success-ink">
          <Icon name="map-pin-check" size={24} />
          <div>
            <div className="text-base font-extrabold">{t.locSaved}</div>
            <div className="text-sm">{f.coords}</div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={f.onCapture}
          className="flex h-[60px] cursor-pointer items-center justify-center gap-2 rounded-[18px] border-2 border-teal bg-teal-soft text-[17px] font-extrabold text-teal-ink"
        >
          <Icon name="locate-fixed" size={22} />
          {t.saveLoc}
        </button>
      )}
    </>
  )
}
