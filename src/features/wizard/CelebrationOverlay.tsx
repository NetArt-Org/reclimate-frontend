"use client"

import { useMemo } from "react"
import { Icon, type IconName } from "@/components/common"
import { Button } from "@/components/ui/button"
import type { Dict } from "@/data/i18n"

export interface CelebrationViewModel {
  icon: IconName
  title: string
  sub: string
  next: string
  credits: { amount: string; label: string; status: string } | null
  onNextDay: (() => void) | null
  onClose: () => void
}

const COLORS = ["#CDEBB0", "#F2C66D", "#FFFDF8", "#7CC4BE", "#E89A6B"]

function Confetti() {
  // Random layout generated once per mount.
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        x: (i * 37.7) % 100,
        w: 6 + ((i * 13) % 6),
        h: 8 + ((i * 7) % 10),
        c: COLORS[i % COLORS.length],
        d: 2.2 + ((i * 11) % 18) / 10,
        delay: ((i * 17) % 9) / 10,
      })),
    []
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="absolute -top-5 rounded-xs"
          style={{
            left: `${p.x}%`,
            width: p.w,
            height: p.h,
            background: p.c,
            animation: `fall ${p.d}s ${p.delay}s cubic-bezier(.3,.6,.5,1) forwards`,
          }}
        />
      ))}
    </div>
  )
}

export function CelebrationOverlay({ t, cel }: { t: Dict; cel: CelebrationViewModel }) {
  return (
    <div className="absolute inset-0 z-60 flex animate-fade-in flex-col overflow-hidden bg-brand-dark text-white">
      <Confetti />
      <div className="relative flex flex-1 flex-col items-center justify-center gap-3.5 px-7 pt-10 text-center">
        <div className="flex size-[120px] animate-pop-slow items-center justify-center rounded-full bg-lime text-brand-dark shadow-[0_0_0_14px_rgba(205,235,176,.15),0_0_0_28px_rgba(205,235,176,.07)]">
          <Icon name={cel.icon} size={60} />
        </div>
        <div className="mt-[18px] animate-rise text-[32px] font-extrabold tracking-[-.8px] [animation-delay:.2s] [animation-fill-mode:both]">
          {cel.title}
        </div>
        <div className="animate-rise text-lg text-brand-mist [animation-delay:.3s] [animation-fill-mode:both]">{cel.sub}</div>
        {cel.credits && (
          <div className="mt-2.5 animate-rise rounded-[20px] border border-white/18 bg-white/10 px-[22px] py-4 [animation-delay:.45s] [animation-fill-mode:both]">
            <div className="text-[40px] font-extrabold tracking-[-1px] text-lime">+{cel.credits.amount}</div>
            <div className="text-[15px] text-brand-mist">{cel.credits.label}</div>
            <div className="mt-2.5 flex items-center justify-center gap-1.5 text-sm font-bold text-gold">
              <Icon name="hourglass" size={16} />
              {cel.credits.status}
            </div>
          </div>
        )}
        <div className="mt-1.5 flex animate-rise items-center gap-1.5 text-[15px] text-brand-haze [animation-delay:.55s] [animation-fill-mode:both]">
          <Icon name="calendar-check" size={16} />
          {cel.next}
        </div>
      </div>
      <div className="relative flex flex-none flex-col gap-2.5 px-5 pt-5 pb-[calc(34px+env(safe-area-inset-bottom))]">
        {cel.onNextDay && (
          <Button variant="ghost-light" size="lg" onClick={cel.onNextDay}>
            {t.celNextDay}
          </Button>
        )}
        <Button variant="lime" size="xl" onClick={cel.onClose}>
          {t.celHome}
        </Button>
      </div>
    </div>
  )
}
