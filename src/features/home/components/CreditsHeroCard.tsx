"use client"

import { Icon } from "@/components/common"
import type { Dict } from "@/data/i18n"
import { cn } from "@/lib/utils"
import type { CreditsSummary } from "../types"

export function CreditsHeroCard({ t, credits, onOpen }: { t: Dict; credits: CreditsSummary; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="cursor-pointer rounded-3xl bg-brand p-5 text-left text-white shadow-[0_12px_26px_rgba(23,63,44,.28)] active:scale-[.99]"
    >
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-semibold text-brand-mist">{t.unused}</div>
        <Icon name="chevron-right" size={22} className="text-brand-mist" />
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div className="text-[54px] leading-none font-extrabold tracking-[-2px] tabular-nums">{credits.unused}</div>
        <div className="text-[17px] font-semibold text-brand-mist">{t.creditsWord}</div>
      </div>
      <div className="mt-2 text-base font-semibold">
        ≈ {credits.value} <span className="text-[13px] font-medium text-brand-haze">· {t.estimate}</span>
      </div>
      <div className="mt-[18px] flex h-3 overflow-hidden rounded-md bg-white/18">
        <div className="animate-grow rounded-md bg-lime" style={{ width: `${credits.pct}%` }} />
        <div className="bg-stripe-pending transition-[width] duration-1000" style={{ width: `${credits.pendPct}%` }} />
      </div>
      <div className="mt-2.5 flex justify-between gap-2 text-sm">
        <span className="font-bold">{credits.progress}</span>
        <span className="text-brand-mist">{credits.toGo}</span>
      </div>
      <div
        className={cn(
          "mt-3 flex items-center gap-2 rounded-xl px-3 py-[9px] text-sm transition-colors duration-600",
          credits.flash ? "bg-[rgba(232,176,75,.5)]" : "bg-white/10"
        )}
      >
        <Icon name="hourglass" size={16} className="text-gold" />
        <span>{credits.pendText}</span>
      </div>
    </button>
  )
}
