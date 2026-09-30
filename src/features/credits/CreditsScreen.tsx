"use client"

import { Icon, ListRow, PageTitle, Screen, SectionTitle, type IconName } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardList } from "@/components/ui/card"
import type { Dict } from "@/data/i18n"
import { cn } from "@/lib/utils"

export interface CreditsScreenProps {
  t: Dict
  unused: string
  toGo: string
  pendText: string
  /** 0‥100 progress toward the payout goal. */
  pct: number
  earned: string
  sold: string
  example: string
  history: { icon: IconName; title: string; date: string; amount: string; positive: boolean }[]
  onSell: () => void
}

function HowStep({ icon, label, className }: { icon: IconName; label: string; className: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
      <div className={cn("flex size-[52px] items-center justify-center rounded-2xl", className)}>
        <Icon name={icon} size={26} />
      </div>
      <div className="text-[13px] leading-[1.3] font-bold">{label}</div>
    </div>
  )
}

export function CreditsScreen(p: CreditsScreenProps) {
  const { t } = p
  return (
    <Screen>
      <PageTitle>{t.creditsTitle}</PageTitle>

      <div className="flex items-center gap-[18px] rounded-3xl bg-brand p-5 text-white">
        <div
          className="flex size-28 flex-none items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--color-lime) ${p.pct}%, rgba(255,255,255,.16) 0)` }}
        >
          <div className="flex size-[88px] flex-col items-center justify-center rounded-full bg-brand">
            <div className="text-2xl font-extrabold">{Math.round(p.pct)}%</div>
            <div className="text-xs font-semibold text-brand-mist">/ 1,000</div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-brand-mist">{t.milestone}</div>
          <div className="mt-0.5 text-[34px] font-extrabold tracking-[-1px]">{p.unused}</div>
          <div className="mt-0.5 text-[15px]">{p.toGo}</div>
          <div className="mt-1.5 text-sm font-semibold text-gold">{p.pendText}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Card className="rounded-[18px] p-3.5">
          <div className="text-[13px] font-bold text-ink-muted">{t.earned}</div>
          <div className="mt-1 text-[21px] font-extrabold">{p.earned}</div>
        </Card>
        <Card className="rounded-[18px] p-3.5">
          <div className="text-[13px] font-bold text-ink-muted">{t.sold}</div>
          <div className="mt-1 text-[21px] font-extrabold">{p.sold}</div>
        </Card>
        <Card className="rounded-[18px] border-[#C9DECF] bg-brand-soft p-3.5">
          <div className="text-[13px] font-bold text-brand">{t.unusedS}</div>
          <div className="mt-1 text-[21px] font-extrabold text-brand">{p.unused}</div>
        </Card>
      </div>

      <Button variant="flat" onClick={p.onSell} className="gap-2.5">
        <Icon name="hand-coins" size={22} />
        {t.sell}
      </Button>

      <Card className="flex flex-col gap-3.5 p-4">
        <div className="text-[17px] font-extrabold">{t.how}</div>
        <div className="flex items-center gap-1.5">
          <HowStep icon="badge-check" label={t.howA} className="bg-ink text-white" />
          <Icon name="arrow-right" size={18} className="text-clay" />
          <HowStep icon="cloud-off" label={t.howB} className="bg-teal-soft text-teal-ink" />
          <Icon name="arrow-right" size={18} className="text-clay" />
          <HowStep icon="coins" label={t.howC} className="bg-brand-soft text-brand" />
        </div>
        <div className="rounded-[14px] border-[1.5px] border-dashed border-clay-line bg-sand p-3">
          <div className="font-mono text-[11px] tracking-[.4px] text-clay">{t.factorLbl}</div>
          <div className="mt-1 text-base font-extrabold">10 L biochar = 1 t CO₂ = 1 credit</div>
          <div className="mt-1.5 text-sm leading-[1.4] text-ink-muted">{p.example}</div>
        </div>
      </Card>

      <SectionTitle className="mt-1">{t.history}</SectionTitle>
      <CardList>
        {p.history.map((h, i) => (
          <ListRow
            key={i}
            className="py-[13px]"
            leading={
              <div
                className={cn(
                  "flex size-[38px] flex-none items-center justify-center rounded-full",
                  h.positive ? "bg-success-soft text-success" : "bg-clay-soft text-clay"
                )}
              >
                <Icon name={h.icon} size={18} />
              </div>
            }
            title={<span className="font-bold">{h.title}</span>}
            sub={h.date}
            trailing={
              <div className={cn("flex-none text-base font-extrabold", h.positive ? "text-success" : "text-clay")}>
                {h.amount}
              </div>
            }
          />
        ))}
      </CardList>
    </Screen>
  )
}
