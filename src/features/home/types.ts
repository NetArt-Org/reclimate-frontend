import type { IconName } from "@/components/common"
import type { StatusView } from "../shared/types"

export type { StatusView }

export interface CreditsSummary {
  unused: string
  value: string
  /** Unused credits as % of the payout goal. */
  pct: number
  /** Credits waiting for approval, as % of the goal. */
  pendPct: number
  progress: string
  toGo: string
  pendText: string
  /** Briefly highlight the pending row after a burn is submitted. */
  flash: boolean
}

export interface TodayTask {
  day: string
  title: string
  sub: string
  icon: IconName
  stepText: string
  pct: number
  burn: string
  chips: { label: string; done: boolean }[]
  onContinue: () => void
}

export interface SiteNumbers {
  biomass: string
  biochar: string
  split: { tone: "approved" | "waiting" | "rejected"; pct: number; label: string; value: string }[]
  flow: { icon: IconName; value: string; label: string }[]
}


export interface FeedbackItem {
  title: string
  sub: string
  status: StatusView
  onOpen: () => void
}
