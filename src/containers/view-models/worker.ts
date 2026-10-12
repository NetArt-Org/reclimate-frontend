import type { IconName } from "@/components/common"
import { DAYS } from "@/data/constants"
import type { BatchDayCard, BatchDetailScreenProps } from "@/features/batches/BatchDetailScreen"
import type { BatchListItem, DaySegment } from "@/features/batches/ProcessScreen"
import type { CreditsScreenProps } from "@/features/credits/CreditsScreen"
import type { SellSheetProps } from "@/features/credits/SellSheet"
import type { HomeScreenProps } from "@/features/home/HomeScreen"
import type { CreditsSummary } from "@/features/home/types"
import { isWet, moistureOf } from "@/lib/batch"
import { L, fill, formatDay, formatElapsed, formatMoney } from "@/lib/format"
import type { Batch } from "@/types"
import {
  activeBatch, batchTitle, batchYieldTitle, bioName, buildHeader, chipFor, credit, dayDef, statusView, type VMContext,
} from "./context"

/** "Load more" for a paged list, or nothing when the server has no more. */
export const more = (ctx: VMContext, list: Parameters<VMContext["a"]["loadMore"]>[0], hasMore: boolean) =>
  hasMore && ctx.s.online
    ? { label: ctx.s.loadingMore[list] ? ctx.t.loadingMore : ctx.t.loadMore, loading: !!ctx.s.loadingMore[list], onPress: () => void ctx.a.loadMore(list) }
    : null

/** Credits as the hero card and the credits screen show them: balance, price and payout goal from the backend. */
export const creditsSummary = (ctx: VMContext): CreditsSummary => {
  const { s, t, nf, lg } = ctx
  const goal = s.rules?.credits.payoutGoal ?? 0
  // Credits already asked to sell are no longer unused.
  const unused = Math.max(0, s.credits.earned - s.credits.sold - s.credits.pending)
  const pend = s.batches.filter((b) => b.status === "waiting" || (b.status === "approved" && !b.adminDecision)).reduce((acc, b) => acc + credit(b, ctx), 0)
  const pct = goal ? Math.min(100, (unused / goal) * 100) : 0
  return {
    unused: nf(unused, 2),
    value: formatMoney(unused * (s.rules?.credits.price ?? 0), s.rules?.credits.currency ?? "", lg),
    pct,
    pendPct: goal ? Math.min(100 - pct, (pend / goal) * 100) : 0,
    progress: `${nf(unused, 2)} / ${nf(goal)}`,
    toGo: unused >= goal ? t.readyToSell : `${nf(goal - unused, 2)} ${t.toGo}`,
    pendText: `+${nf(pend, 2)} ${t.pendCr}`,
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
      sub: `${t.day} ${b.day} · ${L(DAYS[Math.min(b.day, DAYS.length) - 1]?.name, lg)} · ${b.kiln}`,
      onOpen: () => a.openWizard(b.id),
    }))
}

const taskSub = (b: Batch, ctx: VMContext) =>
  [b.kg ? `${bioName(b, ctx)} · ${ctx.nf(b.kg)} kg` : ctx.t.newBatchT, b.kiln].filter(Boolean).join(" · ")

/** The latest things that happened at the site, from the backend's records. */
function recentActivity(ctx: VMContext) {
  const { s, nf, t } = ctx
  const items: { icon: IconName; title: string; at: string }[] = [
    ...s.records.collections.slice(0, 5).map((c) => ({ icon: "wheat" as const, title: `${nf(c.kg)} kg ${c.feedstock.toLowerCase()} · ${c.source}`, at: c.date })),
    ...s.records.packagings.slice(0, 3).map((p) => ({ icon: "shopping-bag" as const, title: `${nf(p.bags)} ${t.bagsL.toLowerCase()} · ${p.packagingType}`, at: p.date })),
    ...s.records.applications.slice(0, 3).map((a) => ({ icon: "sprout" as const, title: `${a.mixType} → ${a.recipient}`, at: a.date })),
    ...s.batches.filter((b) => b.v.burn).slice(0, 5).map((b) => ({ icon: "flame" as const, title: `${t.burnStartedAct} · ${b.kiln || bioName(b, ctx)}`, at: new Date(Number(b.v.burn)).toISOString() })),
  ]
  const today = formatDay(new Date().toISOString())
  return items
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 5)
    .map((x) => ({ icon: x.icon, title: x.title, time: formatDay(x.at) === today ? t.todayW : formatDay(x.at).slice(0, 5) }))
}

export function buildHome(ctx: VMContext): HomeScreenProps {
  const { s, a, t, lg, nf } = ctx
  const tb = activeBatch(s)
  let task: HomeScreenProps["task"] = null
  if (tb) {
    const d = dayDef(tb)
    const st = d.steps[Math.min(tb.step, d.steps.length - 1)]
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

  const st = s.stats
  const b = st?.biochar
  const total = b ? b.approvedL + b.pendingL + b.rejectedL : 0
  const pct = (x: number) => (total ? (x / total) * 100 : 0)
  const trend = st?.trend ?? []
  const max = Math.max(1, ...trend.map((x) => x.litres))
  const co2 = s.credits.earned

  return {
    t,
    header: buildHeader(ctx),
    loading: s.loading && !st,
    credits: creditsSummary(ctx),
    onOpenCredits: () => a.setTab("credits"),
    task,
    onNewBatch: a.newBatch,
    mixReady: mixReadyList(ctx),
    // A mature tree takes up about 22 kg of CO₂ a year.
    impact: fill(t.impact, { co2: nf(co2, 2), trees: nf(Math.round((co2 * 1000) / 22)) }),
    numbers: {
      biomass: nf((st?.biomass.totalKg ?? 0) / 1000, 2),
      biochar: nf(total / 1000, 2),
      split: [
        { tone: "approved", pct: pct(b?.approvedL ?? 0), label: t.approved, value: nf((b?.approvedL ?? 0) / 1000, 1) },
        { tone: "waiting", pct: pct(b?.pendingL ?? 0), label: t.waiting, value: nf((b?.pendingL ?? 0) / 1000, 1) },
        { tone: "rejected", pct: pct(b?.rejectedL ?? 0), label: t.rejected, value: nf((b?.rejectedL ?? 0) / 1000, 1) },
      ],
      flow: [
        { icon: "cooking-pot", value: `${nf((b?.mixedL ?? 0) / 1000, 2)} m³`, label: t.mixed },
        { icon: "truck", value: `${nf(b?.shipped.bags ?? 0)} ${t.bagsL.toLowerCase()}`, label: t.shipped },
        { icon: "sprout", value: `${nf(b?.applied.bags ?? 0)} ${t.bagsL.toLowerCase()}`, label: t.applied },
      ],
    },
    trend: trend.map((x, i) => ({ h: (x.litres / max) * 100, today: i === trend.length - 1 })),
    trendStart: trend[0] ? formatDay(trend[0].day).slice(0, 5) : "",
    feedback: s.batches
      .filter((x) => ["rejected", "approved", "waiting"].includes(x.status))
      .slice(0, 3)
      .map((x) => ({
        title: batchYieldTitle(x, ctx),
        sub:
          x.status === "rejected"
            ? [x.by, L(x.reason, lg)].filter(Boolean).join(": ")
            : x.status === "approved"
              ? [x.adminDecision ? t.finalApproved : t.networkApproved, x.by, x.date].filter(Boolean).join(" · ")
              : `${x.kiln} · ${x.date}`,
        status: statusView(x, ctx),
        onOpen: () => a.openBatch(x.id),
      })),
    activity: recentActivity(ctx),
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
          : `${t.day} ${b.day} ${t.of} 4 · ${L(DAYS[b.day - 1]?.name, lg)}`
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
  const readings = s.rules?.moisture.readings ?? moist.length
  const c = credit(b, ctx)
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
      { label: t.credits, value: c ? `${nf(c, 2)}${b.creditsEstimated || b.credits == null ? ` (${t.estimate})` : ""}` : "—" },
      { label: t.status, value: b.status === "approved" ? (b.adminDecision ? t.finalApproved : t.networkApproved) : statusView(b, ctx).label },
    ],
    days,
    moisture: moist.length >= readings && readings > 0 && b.day > 2 ? moist.map((m) => ({ val: m.val, wet: isWet(m.val) })) : null,
    onBack: a.back,
  }
}

export function buildCredits(ctx: VMContext): CreditsScreenProps {
  const { s, a, t, nf } = ctx
  const c = creditsSummary(ctx)
  // How litres become credits, for this network's main feedstock (the backend's lab values).
  const ex = s.batches.find((b) => b.litres && credit(b, ctx)) ?? s.batches.find((b) => b.litres)
  const f = s.feedstocks.find((x) => x.name === (ex?.bio || "")) ?? s.feedstocks.find((x) => x.creditsPerL)
  const per100 = f?.creditsPerL ? f.creditsPerL * 100 : 0
  return {
    t,
    unused: c.unused,
    toGo: c.toGo,
    pendText: c.pendText,
    pct: c.pct,
    earned: nf(s.credits.earned, 2),
    sold: nf(s.credits.sold, 2),
    factor: f && per100 ? fill(t.factorText, { f: f.name, c: nf(per100, 3) }) : t.factorNone,
    example: ex ? fill(t.example, { l: nf(ex.litres), c: nf(credit(ex, ctx), 2) }) : "",
    history: s.history.map((h) => ({
      icon: (h.kind === "earned" ? "plus" : "hand-coins") as IconName,
      title: h.title,
      date: h.date,
      amount: h.amount === 0 ? "0" : (h.amount > 0 ? "+" : "−") + nf(Math.abs(h.amount), 2),
      positive: h.amount > 0,
    })),
    more: more(ctx, "history", s.historyPage.hasMore),
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
    belowGoal: s.credits.earned - s.credits.sold - s.credits.pending < (s.rules?.credits.payoutGoal ?? 0),
    note: fill(t.sellNote, { g: ctx.nf(s.rules?.credits.payoutGoal ?? 0) }),
    onSend: a.sendSellRequest,
    onClose: a.closeSheet,
  }
}
