"use client"

import { useState } from "react"
import { Icon, MediaView, UserAvatar, type IconName, type MoreProps } from "@/components/common"
import { Switch } from "@/components/ui/switch"
import type { Dict } from "@/data/i18n"
import { cn } from "@/lib/utils"
import type { MediaItem } from "@/types"
import { ClassicCard, ClassicChips, ClassicEmpty, ClassicFab, ClassicMore, ClassicSummary, ClassicTabs, KV, Thumbs } from "./ui"

/** A record made on the phone and not sent yet (shown at the top of its list). */
export interface PendingMark {
  waiting: boolean
  /** The backend refused it: why, and what the worker can do. */
  error?: { message: string; onRetry: () => void; onDiscard: () => void } | null
}

function Pending({ t, mark }: { t: Dict; mark?: PendingMark }) {
  if (!mark?.waiting && !mark?.error) return null
  if (mark.error)
    return (
      <div className="mt-2.5 rounded-lg bg-[#fdecea] px-3 py-2 text-[14px] text-cl-bad">
        {mark.error.message}
        <div className="mt-1.5 flex gap-4 font-semibold">
          <button type="button" onClick={mark.error.onRetry} className="cursor-pointer">
            {t.retry}
          </button>
          <button type="button" onClick={mark.error.onDiscard} className="cursor-pointer">
            {t.discard}
          </button>
        </div>
      </div>
    )
  return (
    <div className="mt-2 flex items-center gap-1.5 text-[14px] text-cl-amber">
      <Icon name="cloud-upload" size={16} />
      {t.waitingUpload}
    </div>
  )
}

const SectionLine = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 text-[16px] text-cl-muted">
    <span className="h-px flex-1 bg-[#cfd8dc]" />
    {label}
    <span className="h-px flex-1 bg-[#cfd8dc]" />
  </div>
)

/* ================================================================== */
/* Home — site summary                                                 */
/* ================================================================== */

export interface ClassicHomeProps {
  t: Dict
  produced: { total: string; approved: string; rejected: string; pending: string; mixed: string; shipped: string; applied: string }
  biomass: { total: string; rows: { name: string; value: string }[] }
  packing: { mixed: string; shipped: string; rows: { bag: string; packed: string; bags: number; shipped: string; shippedBags: number }[] }
}

function Collapsible({ icon, title, value, children }: { icon: IconName; title: string; value?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mx-3 mb-5 overflow-hidden rounded-2xl border border-cl-line shadow-[0_2px_6px_rgba(0,0,0,.08)]">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full cursor-pointer items-center gap-3 border-b border-cl-line px-4 py-4 text-left">
        <Icon name={icon} size={28} className="text-cl-ink" />
        <span className="flex-1 text-[18px] font-semibold text-cl">{title}</span>
        {value && <span className="text-[15px] font-bold">{value}</span>}
        <Icon name={open ? "chevron-up" : "chevron-down"} size={20} />
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  )
}

export function ClassicHome({ t, produced: p, biomass, packing }: ClassicHomeProps) {
  const cell = (icon: IconName, color: string, label: string, value: string) => (
    <div className="flex flex-col items-center gap-1 text-center">
      <Icon name={icon} size={26} className={color} />
      <div className="text-[16px]">{label}</div>
      <div className="text-[16px] font-medium">{value}</div>
    </div>
  )
  return (
    <>
      <SectionLine label={t.siteSummary} />
      <div className="mx-3 mb-5 overflow-hidden rounded-2xl border border-cl-line shadow-[0_2px_6px_rgba(0,0,0,.08)]">
        <div className="flex items-center gap-3 border-b border-cl-line px-4 py-4">
          <Icon name="flame-kindling" size={28} />
          <span className="flex-1 text-[19px]">{t.totalProduced}</span>
          <span className="text-[15px] font-bold">{p.total} m³</span>
        </div>
        <div className="grid grid-cols-3 gap-y-5 px-3 py-5">
          {cell("circle-check", "text-cl-ok", t.approved, `${p.approved} m³`)}
          {cell("circle-x", "text-cl-bad", t.rejected, `${p.rejected} m³`)}
          {cell("hourglass", "text-cl-amber", t.pendingW, `${p.pending} m³`)}
          {cell("cooking-pot", "text-cl-ink", t.mixed, `${p.mixed} m³`)}
          {cell("truck", "text-cl-ink", t.shippedW, p.shipped)}
          {cell("sprout", "text-cl-ink", t.appliedW, p.applied)}
        </div>
      </div>

      <Collapsible icon="wheat" title={t.totalBiomass} value={biomass.total}>
        {biomass.rows.length ? (
          biomass.rows.map((r) => (
            <div key={r.name} className="flex justify-between py-2.5 text-[17px]">
              <span className="font-medium">{r.name}</span>
              <span className="text-cl-muted">{r.value}</span>
            </div>
          ))
        ) : (
          <div className="py-3 text-center text-cl-muted">{t.noData}</div>
        )}
      </Collapsible>

      <Collapsible icon="package" title={t.biocharStats}>
        <div className="flex items-center justify-between border-b border-[#ddd] pb-3 text-[17px]">
          <span className="font-medium">{t.biocharMix}</span>
          <span className="flex items-center gap-3">
            <Icon name="cooking-pot" size={20} /> {packing.mixed} m³ <span className="text-[#bbb]">|</span>
            <Icon name="truck" size={20} /> {packing.shipped}
          </span>
        </div>
        {packing.rows.length ? (
          <table className="mt-2 w-full text-center text-[16px]">
            <thead>
              <tr className="text-cl-ink">
                <th />
                <th className="py-2 font-medium">{t.packedW}</th>
                <th className="py-2 font-medium">{t.shippedW}</th>
              </tr>
            </thead>
            <tbody>
              {packing.rows.map((r, i) => (
                <tr key={`${r.bag}-${i}`} className="border-t border-[#eee]">
                  <td className="py-3 text-left">
                    <Icon name={r.bag === "Open" ? "mountain" : "shopping-bag"} size={22} />
                    <div className="text-[14px]">{r.bag === "Open" ? t.openBag : r.bag}</div>
                  </td>
                  <td>
                    {r.packed}
                    <div className="text-[14px] text-cl-muted">({r.bags})</div>
                  </td>
                  <td>
                    {r.shipped}
                    <div className="text-[14px] text-cl-muted">({r.shippedBags})</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-3 text-center text-cl-muted">{t.noData}</div>
        )}
      </Collapsible>
    </>
  )
}

/* ================================================================== */
/* Biomass Collection                                                  */
/* ================================================================== */

export interface ClassicBiomassProps {
  t: Dict
  totals: { name: string; value: string }[]
  items: ({ id: string; source: string; date: string; feedstock: string; weight: string; transport: string; photo: MediaItem | null } & { mark?: PendingMark })[]
  more: MoreProps | null
  onAdd: () => void
}

export function ClassicBiomass({ t, totals, items, more, onAdd }: ClassicBiomassProps) {
  return (
    <>
      {totals.length > 0 && (
        <ClassicCard className="mt-1">
          {totals.map((r) => (
            <div key={r.name} className="flex justify-between py-0.5 text-[17px]">
              <span>{r.name}</span>
              <span className="text-cl-muted">{r.value}</span>
            </div>
          ))}
        </ClassicCard>
      )}
      <SectionLine label={t.recentCollection} />
      {items.length === 0 && <ClassicEmpty text={t.emptyBiomass} />}
      <div className="flex flex-col gap-4">
        {items.map((c) => (
          <ClassicCard key={c.id}>
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-cl-muted">{t.sourceName}</div>
                <div className="truncate text-[21px]">{c.source}</div>
              </div>
              {c.photo && (
                <div className="size-12 flex-none overflow-hidden rounded-md bg-cl-soft">
                  <MediaView item={c.photo} thumb className="size-full object-cover" />
                </div>
              )}
            </div>
            <div className="mt-2 flex justify-between text-[15px]">
              <span className="text-cl-muted">{t.biomassDetails}</span>
              <span>{c.date}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-[19px]">{c.feedstock}</span>
              <span className="text-[16px]">
                {t.wt} : {c.weight}
              </span>
              <span className="text-[16px]">{c.transport}</span>
            </div>
            <Pending t={t} mark={c.mark} />
          </ClassicCard>
        ))}
      </div>
      <ClassicMore more={more} />
      <ClassicFab onPress={onAdd} label={t.addBiomass} />
    </>
  )
}

/* ================================================================== */
/* Production                                                          */
/* ================================================================== */

export interface ProductionCard {
  id: string
  feedstock: string
  status: string
  date: string
  time: string
  biomass: string
  biochar: string
  media: MediaItem[]
  ongoing: boolean
  rejected: boolean
  reason: string | null
  /** Evidence still to capture (ongoing): label with count, done, and the action. */
  steps: { key: string; icon: IconName; label: string; done: boolean; onPress: () => void; last: MediaItem | null }[]
  missing: string | null
  mark?: PendingMark
  onEditQty: (() => void) | null
  onMoisture: () => void
  onEnd: (() => void) | null
  onAccept: (() => void) | null
  onReject: (() => void) | null
  onFix: (() => void) | null
}

export interface ClassicProductionProps {
  t: Dict
  sub: "ongoing" | "completed"
  onSub: (s: "ongoing" | "completed") => void
  kilns: { value: string; label: string }[]
  kiln: string
  onKiln: (k: string) => void
  cards: ProductionCard[]
  more: MoreProps | null
  onStart: () => void
}

export function ClassicProduction(p: ClassicProductionProps) {
  const { t } = p
  return (
    <>
      <ClassicTabs value={p.sub} onChange={p.onSub} options={[{ value: "ongoing", label: t.ongoing }, { value: "completed", label: t.completed }]} />
      {p.kilns.length > 1 && <ClassicChips value={p.kiln} onChange={p.onKiln} options={p.kilns} />}
      {p.cards.length === 0 && <ClassicEmpty text={p.sub === "ongoing" ? t.emptyOngoing : t.emptyCompleted} />}
      <div className="flex flex-col gap-4 pt-1">
        {p.cards.map((c) => (
          <ClassicCard key={c.id} tone={c.ongoing ? "info" : "warn"}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[22px]">{c.feedstock}</span>
              <span className={cn("text-[16px]", c.rejected && "font-semibold text-cl-bad")}>{c.status}</span>
            </div>
            <div className="mt-2 flex justify-between text-[16px]">
              <span>{c.date}</span>
              <span>{c.time}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[16px] font-semibold">
                  {t.biomassQty}: {c.biomass}
                  {c.onEditQty && (
                    <button type="button" onClick={c.onEditQty} aria-label={t.editQty} className="cursor-pointer">
                      <Icon name="pencil" size={18} />
                    </button>
                  )}
                </div>
                <div className="text-[16px] font-semibold">
                  {t.biocharQty}: {c.biochar}
                </div>
              </div>
              <Icon name="qr-code" size={34} />
            </div>
            {c.rejected && c.reason && <div className="mt-2 rounded-lg bg-[#fdecea] px-3 py-2 text-[15px] text-cl-bad">{c.reason}</div>}

            {c.ongoing ? (
              <div className="mt-3 flex flex-col gap-2.5">
                {c.steps.map((s) => (
                  <button key={s.key} type="button" onClick={s.onPress} className="flex cursor-pointer items-center gap-3 text-left text-[17px] text-cl-dark">
                    <span className={cn("flex size-8 flex-none items-center justify-center rounded-md", s.done ? "bg-cl text-white" : "text-cl")}>
                      <Icon name={s.done ? "check" : s.icon} size={20} />
                    </span>
                    <span className="flex-1">
                      {s.label}
                      {!s.done && <span className="text-cl-bad">*</span>}
                    </span>
                    {s.last && (
                      <span className="size-9 overflow-hidden rounded-md bg-cl-soft">
                        <MediaView item={s.last} thumb className="size-full object-cover" />
                      </span>
                    )}
                  </button>
                ))}
                <div className="mt-1 flex justify-between text-[17px] font-medium text-cl">
                  <button type="button" onClick={c.onMoisture} className="cursor-pointer">
                    {t.viewMoisture}
                  </button>
                  {c.onEnd && (
                    <button type="button" onClick={c.onEnd} className="cursor-pointer">
                      {t.endProcess}
                    </button>
                  )}
                </div>
                {c.missing && <p className="text-[14px] text-cl-bad">{c.missing}</p>}
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <Thumbs items={c.media} />
                  <button type="button" onClick={c.onMoisture} className="mb-3 cursor-pointer text-[17px] text-cl">
                    {t.viewMoisture}
                  </button>
                </div>
                {(c.onAccept || c.onReject || c.onFix) && (
                  <div className="mt-3 flex justify-between text-[17px]">
                    {c.onAccept && (
                      <button type="button" onClick={c.onAccept} className="flex cursor-pointer items-center gap-1.5 text-cl-ok">
                        <Icon name="circle-check" size={20} /> {t.acceptW}
                      </button>
                    )}
                    {c.onReject && (
                      <button type="button" onClick={c.onReject} className="flex cursor-pointer items-center gap-1.5 text-cl-bad">
                        <Icon name="circle-x" size={20} /> {t.rejectW}
                      </button>
                    )}
                    {c.onFix && (
                      <button type="button" onClick={c.onFix} className="flex cursor-pointer items-center gap-1.5 font-semibold text-cl">
                        <Icon name="rotate-ccw" size={20} /> {t.fix}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            <Pending t={t} mark={c.mark} />
          </ClassicCard>
        ))}
      </div>
      <ClassicMore more={p.more} />
      {p.sub === "ongoing" && <ClassicFab onPress={p.onStart} label={t.startProcess} />}
    </>
  )
}

/* ================================================================== */
/* Mixing & Packing                                                    */
/* ================================================================== */

export interface ClassicMixingProps {
  t: Dict
  sub: "mixing" | "packaging"
  onSub: (s: "mixing" | "packaging") => void
  /** The network switched mixing off: only packaging is shown. */
  hideMixing: boolean
  available: { approved: string; pending: string }
  mixings: { id: string; mixType: string; qty: string; total: string; volume: string; date: string; media: MediaItem[]; mark?: PendingMark }[]
  packing: "only" | "mix"
  onPacking: (v: "only" | "mix") => void
  packSummary: { only: string; mixed: string }
  packagings: { id: string; type: string; bag: string; bags: string; qty: string; date: string; media: MediaItem[]; mark?: PendingMark }[]
  moreMixings: MoreProps | null
  morePackagings: MoreProps | null
  onAddMixing: () => void
  onAddPackaging: () => void
}

export function ClassicMixing(p: ClassicMixingProps) {
  const { t } = p
  const sub = p.hideMixing ? "packaging" : p.sub
  return (
    <>
      {!p.hideMixing && <ClassicTabs value={sub} onChange={p.onSub} options={[{ value: "mixing", label: t.mixingT }, { value: "packaging", label: t.packagingT }]} />}
      {sub === "mixing" ? (
        <>
          <ClassicSummary>
            <span className="inline-flex items-center gap-2">
              <span className="font-semibold">{t.biochar}</span>
              <Icon name="circle-check" size={20} className="text-cl-ok" /> {p.available.approved}
              <Icon name="hourglass" size={20} className="ml-2 text-cl-amber" /> {p.available.pending}
            </span>
          </ClassicSummary>
          {p.mixings.length === 0 && <ClassicEmpty text={t.emptyMixing} />}
          <div className="flex flex-col gap-4">
            {p.mixings.map((m) => (
              <ClassicCard key={m.id}>
                <div className="flex items-start justify-between gap-2">
                  <KV k={t.mixTypeL} v={<span className="text-cl-muted">{m.mixType}</span>} />
                  <span className="flex-none text-[15px] text-cl-muted">{m.date}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <KV k={t.mixedQty} v={<span className="text-cl-muted">{m.qty}</span>} />
                  <KV k={t.totalL} v={<span className="text-cl-muted">{m.total}</span>} />
                </div>
                <KV className="mt-2" k={t.volumeBiochar} v={<span className="text-cl-muted">{m.volume}</span>} />
                <Thumbs items={m.media} />
                <Pending t={t} mark={m.mark} />
              </ClassicCard>
            ))}
          </div>
          <ClassicMore more={p.moreMixings} />
          <ClassicFab onPress={p.onAddMixing} label={t.addMixing} />
        </>
      ) : (
        <>
          <ClassicSummary>
            {t.biocharOnly}: {p.packSummary.only} <span className="text-[#bbb]">|</span> {t.biocharMix}: {p.packSummary.mixed}
          </ClassicSummary>
          <div className="mx-3 mb-2 flex gap-3">
            {(["only", "mix"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => p.onPacking(v)}
                className={cn("h-12 flex-1 cursor-pointer rounded-full border text-[17px] font-semibold", p.packing === v ? "border-cl-ink bg-cl text-white" : "border-cl text-cl")}
              >
                {v === "only" ? t.biocharOnly : t.biocharMix}
              </button>
            ))}
          </div>
          {p.packagings.length === 0 && <ClassicEmpty text={t.emptyPacking} />}
          <div className="flex flex-col gap-4">
            {p.packagings.map((x) => (
              <ClassicCard key={x.id}>
                <div className="flex items-start justify-between gap-2">
                  <KV k={t.selectPackagingType.replace(/^Select |^Pilih /, "")} v={<span className="text-cl-muted">{x.type}</span>} />
                  <span className="flex-none text-[15px] text-cl-muted">{x.date}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <KV k={t.bagW} v={<span className="text-cl-muted">{x.bag}</span>} />
                  <KV k={t.bagsL} v={<span className="text-cl-muted">{x.bags}</span>} />
                </div>
                {x.qty && <KV className="mt-2" k={t.quantityL} v={<span className="text-cl-muted">{x.qty}</span>} />}
                <Thumbs items={x.media} />
                <Pending t={t} mark={x.mark} />
              </ClassicCard>
            ))}
          </div>
          <ClassicMore more={p.morePackagings} />
          <ClassicFab onPress={p.onAddPackaging} label={t.addPackaging} />
        </>
      )}
    </>
  )
}

/* ================================================================== */
/* Distribution                                                        */
/* ================================================================== */

export interface ClassicDistributionProps {
  t: Dict
  sub: "application" | "distribution"
  onSub: (s: "application" | "distribution") => void
  receivers: "farmer" | "buyer"
  onReceivers: (r: "farmer" | "buyer") => void
  stock: { key: string; label: string; amount: string; onAdd: (() => void) | null }[]
  summary: string
  items: { id: string; title: string; sub: string; amount: string; date: string; media: MediaItem[]; mark?: PendingMark }[]
  more: MoreProps | null
  onAdd: () => void
}

export function ClassicDistribution(p: ClassicDistributionProps) {
  const { t } = p
  return (
    <>
      <ClassicTabs value={p.sub} onChange={p.onSub} options={[{ value: "application", label: t.applicationT }, { value: "distribution", label: t.distributionT }]} />
      {p.sub === "application" ? (
        <div className="flex flex-col gap-3 pt-3">
          {p.stock.length === 0 && <ClassicEmpty text={t.emptyPacking} />}
          {p.stock.map((s) => (
            <ClassicCard key={s.key} className="py-3.5">
              <div className="flex items-start justify-between gap-2 text-[17px]">
                <span>{s.label}</span>
                <span className="flex-none">{s.amount}</span>
              </div>
              {s.onAdd && (
                <button type="button" onClick={s.onAdd} className="mt-3 ml-auto flex cursor-pointer items-center gap-2 text-[17px]">
                  <Icon name="circle-plus" size={22} /> {t.addApplication}
                </button>
              )}
            </ClassicCard>
          ))}
          {p.items.length > 0 && <SectionLine label={t.recentApplications} />}
        </div>
      ) : (
        <>
          <ClassicChips value={p.receivers} onChange={p.onReceivers} options={[{ value: "farmer", label: t.farmerT }, { value: "buyer", label: t.buyersT }]} />
          <ClassicSummary>{p.summary}</ClassicSummary>
          {p.items.length === 0 && <ClassicEmpty text={t.emptyDistribution} />}
        </>
      )}
      <div className="flex flex-col gap-4">
        {p.items.map((a) => (
          <ClassicCard key={a.id}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[19px]">{a.title}</span>
              <span className="flex-none text-[15px] text-cl-muted">{a.date}</span>
            </div>
            <div className="mt-1 flex justify-between text-[16px]">
              <span className="text-cl-muted">{a.sub}</span>
              <span>{a.amount}</span>
            </div>
            <Thumbs items={a.media} />
            <Pending t={t} mark={a.mark} />
          </ClassicCard>
        ))}
      </div>
      <ClassicMore more={p.more} />
      {p.sub === "distribution" && <ClassicFab onPress={p.onAdd} label={t.addDistribution} />}
    </>
  )
}

/* ================================================================== */
/* Drawer & settings                                                   */
/* ================================================================== */

export interface ClassicDrawerProps {
  t: Dict
  open: boolean
  name: string
  initials: string
  photo: MediaItem | null
  site: string
  role: string
  slow: boolean
  pendingUploads: number
  setupItems: { key: string; label: string; onOpen: () => void }[]
  version: string
  onToggleSlow: () => void
  onChangeNetwork: (() => void) | null
  onSupervisors: () => void
  onUploads: () => void
  onSettings: () => void
  onClose: () => void
}

export function ClassicDrawer(p: ClassicDrawerProps) {
  const { t } = p
  const [setup, setSetup] = useState(false)
  if (!p.open) return null
  const row = (label: string, onPress: () => void, trailing?: React.ReactNode) => (
    <button type="button" onClick={onPress} className="flex w-full cursor-pointer items-center justify-between py-3 text-left text-[18px] text-cl-ink">
      {label}
      {trailing}
    </button>
  )
  return (
    <div className="absolute inset-0 z-40 flex">
      <div className="flex w-[70%] max-w-[300px] animate-fade-in flex-col bg-white px-5 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-xl">
        <div className="flex items-center gap-3">
          <UserAvatar initials={p.initials} photo={p.photo} tone="brand" size={60} />
          <div className="min-w-0">
            <div className="truncate text-[19px] font-semibold">{p.name}</div>
            <div className="truncate text-[14px] text-cl-muted">{p.role}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[14px] text-cl-muted">
          <Icon name="map-pin" size={16} className="text-cl" /> <span className="truncate">{p.site}</span>
        </div>
        <label className="mt-3 flex items-center justify-between border-b border-[#ccc] pb-3 text-[16px]">
          {t.slowMode} : {p.slow ? t.onW : t.offW}
          <Switch checked={p.slow} onCheckedChange={p.onToggleSlow} />
        </label>
        <div className="flex flex-1 flex-col overflow-y-auto pt-1 no-scrollbar">
          {p.onChangeNetwork && row(t.changeNetwork, p.onChangeNetwork)}
          {row(t.supervisorList, p.onSupervisors)}
          {row(t.siteSetting, () => setSetup((x) => !x), <Icon name={setup ? "chevron-up" : "chevron-down"} size={20} />)}
          {setup && (
            <div className="pl-3">
              {p.setupItems.map((s) => (
                <button key={s.key} type="button" onClick={s.onOpen} className="block w-full cursor-pointer py-2.5 text-left text-[17px]">
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {row(
            t.pendingUploads,
            p.onUploads,
            p.pendingUploads ? <span className="rounded-full bg-cl-amber px-2 text-[13px] font-bold text-white">{p.pendingUploads}</span> : undefined
          )}
        </div>
        <button type="button" onClick={p.onSettings} className="mt-3 flex cursor-pointer items-center gap-2 text-[19px] font-semibold">
          <Icon name="settings-2" size={26} /> {t.settingsW}
        </button>
        <div className="mt-1 text-[14px] text-cl-muted">{p.version}</div>
      </div>
      <button type="button" aria-label="Close menu" onClick={p.onClose} className="flex-1 cursor-default bg-black/40" />
    </div>
  )
}

export interface ClassicSettingsProps {
  t: Dict
  name: string
  phone: string
  email: string
  role: string
  site: string
  initials: string
  photo: MediaItem | null
  language: string
  ui: "new" | "classic"
  onUi: (ui: "new" | "classic") => void
  onPhoto: () => void
  onEdit: () => void
  onLanguage: () => void
  onLogout: () => void
  onPrivacy: () => void
  onTerms: () => void
  onDeleteAccount: () => void
  onBack: () => void
}

export function ClassicSettings(p: ClassicSettingsProps) {
  const { t } = p
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-white text-cl-ink">
      <div className="flex items-center gap-3 px-3 pt-2 pb-4">
        <button type="button" onClick={p.onBack} aria-label={t.back} className="flex size-11 cursor-pointer items-center justify-center">
          <Icon name="arrow-left" size={26} />
        </button>
        <h1 className="flex-1 pr-11 text-center text-[21px] font-semibold">{t.settingsW}</h1>
      </div>
      <div className="flex flex-col gap-5 px-6">
        <div className="flex items-start gap-5">
          <UserAvatar initials={p.initials} photo={p.photo} tone="brand" size={92} editable onClick={p.onPhoto} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1 text-[16px]">
            <div className="truncate">
              {t.nameL}: <b className="font-medium">{p.name}</b>
            </div>
            <div className="truncate">
              {t.phoneL}: <b className="font-medium">{p.phone}</b>
            </div>
            <div className="truncate">
              {t.roleLbl}: <b className="font-medium">{p.role}</b>
            </div>
          </div>
        </div>
        <div className="text-[16px]">
          Artisan Pro: <b className="font-medium">{p.site}</b>
        </div>
        {p.email && <div className="truncate text-[16px]">{t.loginEmail}: {p.email}</div>}
        <div className="flex items-center justify-between text-[17px]">
          <span>
            {t.languageL} : {p.language}
          </span>
          <button type="button" onClick={p.onLanguage} aria-label={t.editW} className="cursor-pointer">
            <Icon name="pencil" size={22} />
          </button>
        </div>
        <div className="flex items-center justify-between text-[17px]">
          <span>{t.uiSwitch}</span>
          <div className="flex gap-2">
            {(["classic", "new"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => p.onUi(v)}
                className={cn("h-10 cursor-pointer rounded-full border px-4 text-[15px]", p.ui === v ? "border-cl bg-cl text-white" : "border-cl-ink/30 text-cl")}
              >
                {v === "classic" ? t.uiClassic : t.uiNew}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={p.onEdit} className="h-[54px] cursor-pointer rounded-full border border-[#ccc] text-[18px] text-cl">
          {t.editProfile}
        </button>
        <button type="button" onClick={p.onLogout} className="h-[54px] cursor-pointer rounded-full border border-[#ccc] text-[18px] text-cl">
          {t.logout}
        </button>
        <div className="flex justify-center gap-6 text-[15px] text-cl">
          <button type="button" onClick={p.onPrivacy} className="cursor-pointer">
            {t.privacyPolicy}
          </button>
          <button type="button" onClick={p.onTerms} className="cursor-pointer">
            {t.termsOfUse}
          </button>
        </div>
        <button type="button" onClick={p.onDeleteAccount} className="cursor-pointer text-center text-[15px] font-semibold text-cl-bad">
          {t.deleteAccount}
        </button>
      </div>
    </div>
  )
}
