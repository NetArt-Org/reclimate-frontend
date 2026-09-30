import { BIO, CREDIT_FACTOR, DAYS, STATUS_META } from "@/data/constants"
import type { Dict } from "@/data/i18n"
import type { StatusView } from "@/features/shared/types"
import type { GreetingHeaderProps } from "@/features/shared/GreetingHeader"
import { fieldProgress } from "@/lib/batch"
import { L, formatNumber, nameParts } from "@/lib/format"
import type { AppState, ArtisanActions } from "@/store/useArtisanStore"
import type { Batch, FieldDef, Lang } from "@/types"

/** Everything a view-model builder needs. */
export interface VMContext {
  s: AppState
  a: ArtisanActions
  t: Dict
  lg: Lang
  nf: (n: number, digits?: number) => string
}

export const createContext = (s: AppState, a: ArtisanActions, t: Dict): VMContext => ({
  s, a, t, lg: s.lang, nf: (n, d = 0) => formatNumber(n, s.lang, d),
})

export const credit = (litres: number) => litres * CREDIT_FACTOR

export const bioName = (b: Batch, { t, lg }: VMContext) => (b.bio ? L(BIO[b.bio] ?? b.bio, lg) : t.newBatchT)

/** "Corn cob · 898 kg" */
export const batchTitle = (b: Batch, ctx: VMContext) => (b.kg ? `${bioName(b, ctx)} · ${ctx.nf(b.kg)} kg` : ctx.t.newBatchT)

/** "Corn cob · 792 kg → 798 L" */
export const batchYieldTitle = (b: Batch, ctx: VMContext) =>
  `${bioName(b, ctx)} · ${ctx.nf(b.kg)} kg → ${ctx.nf(b.litres)} L`

export const statusView = (b: Batch, { lg }: VMContext): StatusView => {
  const m = STATUS_META[b.status]
  return { label: L(m.label, lg), icon: m.icon, tone: m.tone }
}

export const chipFor = (f: FieldDef, b: Batch, lg: Lang) => {
  const p = fieldProgress(f, b)
  const lbl = L(f.label, lg)
  return { label: p.need ? `${lbl} ${p.have}/${p.need}` : lbl, done: p.done }
}

/** The batch shown as "Today's task": in progress, else approved and not finished. */
export const activeBatch = (s: AppState) =>
  s.batches.find((b) => b.status === "progress") ?? s.batches.find((b) => b.status === "approved" && b.day <= 4)

export const dayDef = (b: Batch) => DAYS[Math.min(b.day, 4) - 1]

export const profileInfo = (ctx: VMContext) => {
  const { s, t } = ctx
  const role = s.user ?? "worker"
  const cur = s.profiles[role]
  const { short, initials } = nameParts(cur.name)
  return {
    ...cur,
    short,
    initials,
    roleLabel: s.user === "sup" ? t.roleSupLbl : t.role,
    photo: s.avatarItem,
    avatarTone: (s.user === "sup" ? "brand" : "clay") as "brand" | "clay",
  }
}

export const buildHeader = (ctx: VMContext): GreetingHeaderProps => {
  const { s, a, t } = ctx
  const p = profileInfo(ctx)
  return {
    hello: t.hello,
    name: p.short,
    initials: p.initials,
    photo: p.photo,
    avatarTone: p.avatarTone,
    online: s.online,
    onlineLabel: s.online ? t.online : t.offline,
    site: s.site,
    onToggleOnline: a.toggleOnline,
    onOpenPhoto: () => a.openSheet("photo"),
    onOpenSite: () => a.openSheet("site"),
  }
}
