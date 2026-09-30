import { CREDIT_GOAL, CREDIT_PRICE, DAYS, TREND } from "@/data/constants"
import type { BatchDayCard, BatchDetailScreenProps } from "@/features/batches/BatchDetailScreen"
import type { BatchListItem, DaySegment } from "@/features/batches/ProcessScreen"
import type { CreditsScreenProps } from "@/features/credits/CreditsScreen"
import type { SellSheetProps } from "@/features/credits/SellSheet"
import type { HomeScreenProps } from "@/features/home/HomeScreen"
import type { CreditsSummary } from "@/features/home/types"
import { isWet, moistureOf } from "@/lib/batch"
import { L, fill, formatElapsed, formatRupiahMillions } from "@/lib/format"
import type { Batch } from "@/types"
import {
  activeBatch, batchTitle, batchYieldTitle, bioName, buildHeader, chipFor, credit, dayDef, statusView, type VMContext,
} from "./context"

export const creditsSummary = (ctx: VMContext): CreditsSummary => {
  const { s, t, nf, lg } = ctx
  const unused = s.credits.earned - s.credits.sold
  const pend = s.batches.filter((b) => b.status === "waiting").reduce((acc, b) => acc + credit(b.litres), 0)
  const pct = Math.min(100, (unused / CREDIT_GOAL) * 100)
  return {
    unused: nf(unused),
    value: formatRupiahMillions(unused * CREDIT_PRICE, lg),
    pct,
    pendPct: Math.min(100 - pct, (pend / CREDIT_GOAL) * 100),
    progress: `${nf(unused)} / ${nf(CREDIT_GOAL)}`,
    toGo: unused >= CREDIT_GOAL ? t.readyToSell : `${nf(CREDIT_GOAL - unused)} ${t.toGo}`,
    pendText: `+${nf(pend)} ${t.pendCr}`,
    flash: s.heroFlash,
  }
}

export const mixReadyList = (ctx: VMContext) => {
  const { s, t, nf, lg, a } = ctx
  const tb = activeBatch(s)
  return s.batches
    .filter((b) => b.status === "approved" && b.day >= 3 && b.day <= 4 && b !== tb)
    .map((b) => ({
      id: b.id,
      title: `${bioName(b, ctx)} · ${nf(b.litres)} L`,
      sub: `${t.day} ${b.day} · ${L(DAYS[b.day - 1].name, lg)} · ${b.kiln}`,
      onOpen: () => a.openWizard(b.id),
    }))
}

const taskSub = (b: Batch, ctx: VMContext) =>
  [b.kg ? `${bioName(b, ctx)} · ${ctx.nf(b.kg)} kg` : ctx.t.newBatchT, b.kiln].filter(Boolean).join(" · ")

export function buildHome(ctx: VMContext): HomeScreenProps {
  const { s, a, t, lg, nf } = ctx
  const tb = activeBatch(s)
  let task: HomeScreenProps["task"] = null
  if (tb) {
    const d = dayDef(tb)
    const st = d.steps[tb.step]
    task = {
      day: `${t.day} ${d.n} · ${L(d.name, lg)}`,
      title: L(st.title, lg),
      icon: d.icon,
      sub: taskSub(tb, ctx),
      stepText: fill(t.stepOf, { a: tb.step + 1, b: d.steps.length }),
      pct: (tb.step / d.steps.length) * 100,
      burn: tb.day === 2 && tb.v.burn ? formatElapsed(Number(tb.v.burn), s.now) : "",
      chips: st.fields.map((f) => chipFor(f, tb, lg)),
      onContinue: () => a.openWizard(tb.id),
    }
  }

  const max = Math.max(...TREND)
  const co2 = s.credits.earned
  const activity = [
    { icon: "flame" as const, title: { en: "Burn started · Masri Malay 5", id: "Pembakaran dimulai · Masri Malay 5" }, time: t.todayW },
    { icon: "wheat" as const, title: { en: "898 kg corn cob from Pak Masri Malay", id: "898 kg tongkol jagung dari Pak Masri Malay" }, time: t.todayW },
    { icon: "wheat" as const, title: { en: "4,488 kg corn cob from Pak Masri Malay", id: "4.488 kg tongkol jagung dari Pak Masri Malay" }, time: "18/09" },
    { icon: "shopping-bag" as const, title: { en: "1 sack packed · Biochar-Compost 1:1", id: "1 karung dikemas · Biochar-Kompos 1:1" }, time: "30/06" },
  ]

  return {
    t,
    header: buildHeader(ctx),
    loading: s.loading,
    credits: creditsSummary(ctx),
    onOpenCredits: () => a.setTab("credits"),
    task,
    onNewBatch: a.newBatch,
    mixReady: mixReadyList(ctx),
    impact: fill(t.impact, { co2: nf(co2), trees: nf(Math.round(co2 / 0.022 / 100) * 100) }),
    // Site-level totals — static in the prototype, from the dMRV API in production.
    numbers: {
      biomass: "410.36",
      biochar: "398.29",
      split: [
        { tone: "approved", pct: 61.6, label: t.approved, value: "245.2" },
        { tone: "waiting", pct: 36.6, label: t.waiting, value: "146.0" },
        { tone: "rejected", pct: 1.8, label: t.rejected, value: "7.1" },
      ],
      flow: [
        { icon: "cooking-pot", value: "0.04 m³", label: t.mixed },
        { icon: "truck", value: "0.00 m³", label: t.shipped },
        { icon: "sprout", value: "0.00 m³", label: t.applied },
      ],
    },
    trend: TREND.map((v, i) => ({ h: (v / max) * 100, today: i === TREND.length - 1 })),
    trendStart: "24/08",
    feedback: s.batches
      .filter((b) => ["rejected", "approved", "waiting"].includes(b.status))
      .slice(0, 3)
      .map((b) => ({
        title: batchYieldTitle(b, ctx),
        sub:
          b.status === "rejected"
            ? [b.by, L(b.reason, lg)].filter(Boolean).join(": ")
            : b.status === "approved"
              ? [b.by, b.date].filter(Boolean).join(" · ")
              : `${b.kiln} · ${b.date}`,
        status: statusView(b, ctx),
        onOpen: () => a.openBatch(b.id),
      })),
    activity: activity.map((x) => ({ icon: x.icon, title: L(x.title, lg), time: x.time })),
  }
}

export function buildProcess(ctx: VMContext): BatchListItem[] {
  const { s, a, t, lg } = ctx
  const dayText = (b: Batch) =>
    b.day > 4
      ? t.allDaysDone
      : b.status === "waiting"
        ? `${t.day} 2 ${t.doneLbl.toLowerCase()} · ${t.waitSup}`
        : b.status === "rejected"
          ? `${t.day} 2 · ${t.fixNeeded}`
          : `${t.day} ${b.day} ${t.of} 4 · ${L(DAYS[b.day - 1].name, lg)}`
  const seg = (b: Batch, d: number): DaySegment =>
    d < b.day
      ? b.status === "rejected" && d === 2
        ? "failed"
        : "done"
      : d === b.day
        ? b.status === "waiting"
          ? "waiting"
          : b.status === "rejected"
            ? "todo"
            : "current"
        : "todo"
  return s.batches.map((b) => ({
    id: b.id,
    title: batchTitle(b, ctx),
    sub: [b.kiln, b.date].filter(Boolean).join(" · "),
    status: statusView(b, ctx),
    days: [1, 2, 3, 4].map((d) => seg(b, d)),
    dayText: dayText(b),
    rejectedReason: b.status === "rejected" ? L(b.reason, lg) : null,
    onOpen: () => a.openBatch(b.id),
    onFix: () => a.fixBatch(b.id),
  }))
}

export function buildBatchDetail(ctx: VMContext): BatchDetailScreenProps | null {
  const { s, a, t, lg, nf } = ctx
  const b = s.batches.find((x) => x.id === s.batchId)
  if (!b) return null
  const days: BatchDayCard[] = DAYS.map((d) => {
    const base = { n: `${t.day} ${d.n}`, name: L(d.name, lg) }
    if (b.status === "rejected" && d.n === 2)
      return { ...base, icon: "circle-x", state: "fix", stateText: t.fixNeeded, action: { label: t.fix, onPress: () => a.fixBatch(b.id) } }
    if (d.n < b.day) return { ...base, icon: "check", state: "done", stateText: t.doneLbl }
    if (d.n === b.day && b.status === "waiting") return { ...base, icon: "lock", state: "waiting", stateText: t.waitSup }
    if (d.n === b.day && b.status !== "rejected")
      return {
        ...base,
        icon: d.icon,
        state: "current",
        stateText: fill(t.stepOf, { a: b.step + 1, b: d.steps.length }),
        action: { label: t.cont, onPress: () => a.openWizard(b.id) },
      }
    return { ...base, icon: "lock", state: "locked", stateText: fill(t.unlocksAfter, { n: d.n - 1 }) }
  })
  const moist = moistureOf(b)
  return {
    t,
    title: batchTitle(b, ctx),
    id: b.id,
    status: statusView(b, ctx),
    rejected: b.status === "rejected" ? { reason: [b.by, L(b.reason, lg)].filter(Boolean).join(": "), onFix: () => a.fixBatch(b.id) } : null,
    stats: [
      { label: t.biomass, value: b.kg ? `${nf(b.kg)} kg` : "—" },
      { label: t.biochar, value: b.litres ? `${nf(b.litres)} L` : "—" },
      { label: t.kiln, value: b.kiln || "—" },
      { label: t.date, value: b.date },
    ],
    days,
    moisture: moist.length === 5 && b.day > 2 ? moist.map((m) => ({ val: m.val, wet: isWet(m.val) })) : null,
    onBack: a.back,
  }
}

export function buildCredits(ctx: VMContext): CreditsScreenProps {
  const { s, a, t, lg, nf } = ctx
  const c = creditsSummary(ctx)
  const ex = s.batches.find((b) => b.status === "waiting") ?? s.batches.find((b) => b.litres) ?? { litres: 798 }
  return {
    t,
    unused: c.unused,
    toGo: c.toGo,
    pendText: c.pendText,
    pct: c.pct,
    earned: nf(s.credits.earned),
    sold: nf(s.credits.sold),
    example: fill(t.example, { l: nf(ex.litres), c: nf(credit(ex.litres), 1) }),
    history: s.history.map((h) => ({
      icon: h.icon,
      title: L(h.title, lg),
      date: h.date,
      amount: (h.amt > 0 ? "+" : "−") + nf(Math.abs(h.amt), 1),
      positive: h.amt > 0,
    })),
    onSell: () => a.openSheet("sell"),
  }
}

export function buildSell(ctx: VMContext): SellSheetProps {
  const { s, a, t } = ctx
  const c = creditsSummary(ctx)
  return {
    t,
    open: s.sheet === "sell",
    step: s.sellStep,
    unused: c.unused,
    value: c.value,
    buyer: a.setupItems("buyers")[0]?.name ?? "—",
    belowGoal: s.credits.earned - s.credits.sold < CREDIT_GOAL,
    onSend: a.sendSellRequest,
    onClose: a.closeSheet,
  }
}
