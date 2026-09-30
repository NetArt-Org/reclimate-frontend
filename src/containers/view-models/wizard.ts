import { BIO, DAYS, SETUP } from "@/data/constants"
import type { CameraViewModel } from "@/features/wizard/CameraOverlay"
import type { CelebrationViewModel } from "@/features/wizard/CelebrationOverlay"
import type { StartOption } from "@/features/wizard/StartSheet"
import type { WizardFieldView, WizardViewModel } from "@/features/wizard/types"
import { bioLabel, fieldProgress, isWet, mediaOf, moistureOf } from "@/lib/batch"
import { L, fill, formatClock, formatElapsed } from "@/lib/format"
import type { Batch, ChoiceOption, FieldDef } from "@/types"
import { activeBatch, batchTitle, dayDef, type VMContext } from "./context"
import { mixReadyList } from "./worker"

/** Choice options that come from the editable site-setup lists. */
function dynamicOptions(from: NonNullable<Extract<FieldDef, { type: "choice" }>["from"]>, ctx: VMContext): ChoiceOption[] {
  const g = ctx.a.setupItems
  switch (from) {
    case "source":
      return [
        ...g("sources").map((i) => ({ v: i.name, sub: { en: "Biomass source", id: "Sumber biomassa" }, icon: "warehouse" as const })),
        ...g("farmers").map((i) => ({
          v: i.name,
          sub: { en: "Farmer" + (i.sub ? " · " + i.sub : ""), id: "Petani" + (i.sub ? " · " + i.sub : "") },
          icon: "user-round" as const,
        })),
      ]
    case "bioref":
      return g("bioref").map((i) => ({ v: i.name, label: BIO[i.name] ?? i.name, icon: "wheat" as const }))
    case "kilns":
      return g("kilns").map((i) => ({ v: i.name, sub: i.sub || null, icon: "flame-kindling" as const }))
    case "bags":
      return [
        ...g("bags").map((i) => ({ v: i.name, sub: i.sub || null, icon: "shopping-bag" as const })),
        { v: "Open", label: { en: "No bag (loose)", id: "Tanpa karung (curah)" }, icon: "mountain" as const },
      ]
    case "to":
      return [
        ...g("farmers").map((i) => ({ v: i.name, sub: { en: "Farmer", id: "Petani" }, icon: "user-round" as const })),
        ...g("buyers").map((i) => ({ v: i.name, sub: { en: "Buyer", id: "Pembeli" }, icon: "building-2" as const })),
      ]
  }
}

function buildField(f: FieldDef, b: Batch, ctx: VMContext): WizardFieldView {
  const { a, t, lg, nf, s } = ctx
  const v = b.v
  const p = fieldProgress(f, b)
  const label = L(f.label, lg)
  switch (f.type) {
    case "choice": {
      const cat = f.addKey ? SETUP.find((c) => c.key === f.addKey) : undefined
      const opts = f.from ? dynamicOptions(f.from, ctx) : (f.opts ?? [])
      return {
        type: "choice",
        key: f.k,
        label,
        options: opts.map((o) => ({
          value: o.v,
          label: L(o.label ?? o.v, lg),
          sub: o.sub ? L(o.sub, lg) : null,
          icon: o.icon,
          selected: v[f.k] === o.v,
          onPick: () => a.setVal(b.id, f.k, o.v),
        })),
        add: cat
          ? { label: fill(t.addNewOf, { x: L(cat.name, lg).toLowerCase() }), onPress: () => a.openAdd(cat.key, { bid: b.id, k: f.k }) }
          : null,
      }
    }
    case "number": {
      const selUnit = f.units ? String(v[f.uk ?? "unit"] ?? f.units[0]) : ""
      const hint =
        f.hint === "avail"
          ? `${t.available}: ${nf(b.litres)} L`
          : f.hint === "bags"
            ? `${t.available}: ${v.bags || 0} ${lg === "id" ? "karung" : "bags"}`
            : f.hint
              ? L(f.hint, lg)
              : null
      return {
        type: "number",
        key: f.k,
        label,
        value: String(v[f.k] ?? ""),
        unit: f.units ? selUnit : L(f.unit, lg),
        units: f.units
          ? f.units.map((u) => ({ label: u, selected: u === selUnit, onPick: () => a.setVal(b.id, f.uk ?? "unit", u) }))
          : null,
        hint,
        warn: p.over ? t.tooMuch : null,
        state: p.over ? "invalid" : p.done ? "valid" : "idle",
        onChange: (val) => a.setVal(b.id, f.k, val),
      }
    }
    case "media": {
      const arr = mediaOf(b, f.k)
      const video = f.kind === "video"
      return {
        type: "media",
        key: f.k,
        label,
        count: `${arr.length}/${f.need}`,
        done: p.done,
        kind: f.kind,
        slots: Array.from({ length: f.need }, (_, i) => {
          const it = arr[i]
          const next = !it && i === arr.length
          return {
            media: it ?? null,
            pending: !!it?.pend,
            next,
            label: next ? (video ? t.tapRec : t.tapTake) : `${i + 1}`,
            onOpen: () => !it && a.openCamera(b.id, f),
          }
        }),
      }
    }
    case "moist": {
      const r = moistureOf(b)
      return {
        type: "moist",
        key: f.k,
        label,
        count: `${p.have}/5`,
        done: p.done,
        tooWetLabel: t.tooWet,
        rows: [0, 1, 2, 3, 4].map((i) => {
          const x = r[i] ?? { val: "", ph: null }
          return {
            n: i + 1,
            value: x.val,
            wet: isWet(x.val),
            ok: x.val !== "" && !!x.ph,
            photo: x.ph,
            onChange: (val: string) => a.setMoisture(b.id, i, val),
            onSnap: () => a.openCamera(b.id, f, i),
          }
        }),
      }
    }
    case "timer": {
      const burn = v.burn ? Number(v.burn) : undefined
      return {
        type: "timer",
        key: f.k,
        started: !!burn,
        elapsed: formatElapsed(burn, v.burnEnd ? Number(v.burnEnd) : s.now),
        startedAt: burn ? formatClock(burn) : "",
        onStart: () => a.startBurn(b.id),
      }
    }
    case "loc":
      return { type: "loc", key: f.k, label, coords: v.loc ? String(v.loc) : null, onCapture: () => a.captureLocation(b.id) }
  }
}

export function buildWizard(ctx: VMContext): WizardViewModel | null {
  const { s, a, t, lg } = ctx
  const w = s.wiz
  const b = w && s.batches.find((x) => x.id === w.bid)
  if (s.view !== "wizard" || !w || !b) return null
  const d = DAYS[w.day - 1]
  const st = d.steps[w.step]
  const pending = st.fields.map((f) => ({ f, p: fieldProgress(f, b) })).filter((x) => !x.p.done)
  const missing = pending.map(({ f, p }) =>
    p.wet
      ? t.tooWetShort
      : p.need
        ? `${L(f.label, lg).toLowerCase()} (${fill(t.more, { n: p.need - (p.have ?? 0) })})`
        : L(f.label, lg).toLowerCase()
  )
  const ready = missing.length === 0
  const last = w.step === d.steps.length - 1
  return {
    stepKey: `${w.bid}-${w.day}-${w.step}`,
    dayTitle: `${t.day} ${d.n} · ${L(d.name, lg)}`,
    stepText: fill(t.stepOf, { a: w.step + 1, b: d.steps.length }),
    batchLabel: batchTitle(b, ctx),
    segments: d.steps.map((_, i) => ({
      state: i < w.step ? "done" : i === w.step ? "current" : i <= b.step && w.day === b.day ? "reached" : "todo",
      onClick: () => (i <= b.step || w.day < b.day) && a.goToStep(i),
    })),
    burnTime: w.day === 2 && b.v.burn && w.step >= 3 ? formatElapsed(Number(b.v.burn), s.now) : null,
    illustration: st.ill,
    title: L(st.title, lg),
    instructions: L(st.ins, lg),
    fields: st.fields.map((f) => buildField(f, b, ctx)),
    chips: st.fields.map((f) => {
      const p = fieldProgress(f, b)
      const lbl = L(f.label, lg)
      return { label: p.need ? `${lbl} ${p.have}/${p.need}` : lbl, done: p.done }
    }),
    missing: ready ? null : `${t.stillNeeded}: ${missing.join(", ")}`,
    ready,
    doneLabel: b.fixing ? t.fix : last ? L(st.done, lg) || t.done : t.next,
    doneIcon: ready ? (last || b.fixing ? "check" : "arrow-right") : "lock",
    saving: s.now - s.savedAt < 1500,
    onDone: a.completeStep,
    onExit: a.exitWizard,
  }
}

export function buildCamera(ctx: VMContext): CameraViewModel | null {
  const { s, a, t, lg } = ctx
  const c = s.cam
  if (!c) return null
  const b = c.bid ? s.batches.find((x) => x.id === c.bid) : undefined
  const have = c.slot != null || !b || !c.k ? 0 : mediaOf(b, c.k).length
  const video = c.kind === "video"
  return {
    title: L(c.label, lg),
    hint: video ? t.camVidHint : t.camPhotoHint,
    counter: c.slot != null ? `${c.slot + 1}/5` : `${Math.min(have + 1, c.need)}/${c.need}`,
    tip: L(c.tip, lg),
    video,
    front: !!c.avatar,
    slow: s.slow,
    last: b && c.k && c.slot == null ? (mediaOf(b, c.k).at(-1) ?? null) : null,
    onCapture: a.capture,
    onClose: a.closeCamera,
  }
}

export function buildCelebration(ctx: VMContext): CelebrationViewModel | null {
  const { s, a, t, lg, nf } = ctx
  const c = s.cel
  if (!c) return null
  const b = s.batches.find((x) => x.id === c.bid)
  const credits = (label: string, status: string) => ({ amount: nf(c.credits ?? 0, 1), label, status })
  const base = { onNextDay: null, credits: null, onClose: a.closeCelebration }
  const next = () => a.openWizard(c.bid)
  switch (c.kind) {
    case "d1":
      return {
        ...base,
        icon: "wheat",
        title: t.d1Title,
        sub: fill(t.d1Sub, { kg: nf(c.kg ?? 0), bio: bioLabel(c.bio ?? "", lg).toLowerCase() }),
        next: t.d1Next,
        onNextDay: next,
      }
    case "d2":
      return { ...base, icon: "flame", title: t.d2Title, sub: fill(t.d2Sub, { l: nf(c.l ?? 0) }), next: t.d2Next, credits: credits(t.celCreditsLbl, t.waitApproval) }
    case "d3":
      return { ...base, icon: "shopping-bag", title: t.d3Title, sub: fill(t.d3Sub, { n: c.n ?? 0 }), next: t.d3Next, onNextDay: next }
    case "batch":
      return {
        ...base,
        icon: "sprout",
        title: t.batchTitle,
        sub: t.batchSub,
        next: t.batchNext,
        credits: credits(t.celEarned, b?.status === "done" ? (lg === "id" ? "Selesai" : "Complete") : t.waitApproval),
      }
    case "res":
      return { ...base, icon: "send", title: t.resTitle, sub: t.resSub, next: t.resNext, credits: credits(t.celCreditsLbl, t.waitApproval) }
  }
}

export function buildStartOptions(ctx: VMContext): StartOption[] {
  const { s, a, t, lg } = ctx
  const tb = activeBatch(s)
  const opts: StartOption[] = []
  if (tb) {
    const d = dayDef(tb)
    opts.push({
      key: "continue",
      icon: d.icon,
      title: fill(t.continueDay, { n: tb.day, name: L(d.name, lg) }),
      sub: [batchTitle(tb, ctx), tb.kiln].filter(Boolean).join(" · "),
      primary: true,
      onPress: () => a.openWizard(tb.id),
    })
  }
  opts.push({ key: "new", icon: "plus", title: t.newBatch, sub: t.newBatchSub, primary: false, onPress: a.newBatch })
  mixReadyList(ctx).forEach((m) =>
    opts.push({ key: m.id, icon: "cooking-pot", title: t.mixReady, sub: m.title, primary: false, onPress: m.onOpen })
  )
  return opts
}
