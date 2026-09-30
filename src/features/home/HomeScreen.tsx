"use client"

import { Icon, Screen, SectionTitle, type IconName } from "@/components/common"
import type { Dict } from "@/data/i18n"
import { GreetingHeader, type GreetingHeaderProps } from "../shared/GreetingHeader"
import { CreditsHeroCard } from "./components/CreditsHeroCard"
import { ActivityList, FeedbackList } from "./components/FeedbackList"
import { HomeSkeleton } from "./components/HomeSkeleton"
import { SiteStats, TrendChart } from "./components/SiteStats"
import { AllDoneCard, MixReadyCard, TodayTaskCard } from "./components/TodayTaskCard"
import type { CreditsSummary, FeedbackItem, SiteNumbers, TodayTask } from "./types"

export interface HomeScreenProps {
  t: Dict
  header: GreetingHeaderProps
  loading: boolean
  credits: CreditsSummary
  onOpenCredits: () => void
  task: TodayTask | null
  onNewBatch: () => void
  mixReady: { title: string; sub: string; onOpen: () => void }[]
  impact: string
  numbers: SiteNumbers
  trend: { h: number; today: boolean }[]
  trendStart: string
  feedback: FeedbackItem[]
  activity: { icon: IconName; title: string; time: string }[]
}

export function HomeScreen(p: HomeScreenProps) {
  const { t } = p
  return (
    <Screen>
      <GreetingHeader {...p.header} />
      {p.loading ? (
        <HomeSkeleton />
      ) : (
        <div className="flex animate-rise flex-col gap-4">
          <CreditsHeroCard t={t} credits={p.credits} onOpen={p.onOpenCredits} />
          {p.task ? <TodayTaskCard t={t} task={p.task} /> : <AllDoneCard t={t} onNewBatch={p.onNewBatch} />}
          {p.mixReady.map((m) => (
            <MixReadyCard key={m.title} label={t.mixReady} {...m} />
          ))}
          <div className="flex items-center gap-3 rounded-[18px] bg-teal-soft px-4 py-3.5 text-teal-ink">
            <Icon name="leaf" size={26} className="flex-none" />
            <div className="text-[15px] leading-[1.4] font-semibold text-pretty">{p.impact}</div>
          </div>

          <SectionTitle>{t.numbers}</SectionTitle>
          <SiteStats t={t} numbers={p.numbers} />
          <TrendChart title={t.trend} bars={p.trend} start={p.trendStart} end={t.todayW} />

          <SectionTitle>{t.feedback}</SectionTitle>
          <FeedbackList items={p.feedback} />

          <SectionTitle>{t.activity}</SectionTitle>
          <ActivityList items={p.activity} />
        </div>
      )}
    </Screen>
  )
}
