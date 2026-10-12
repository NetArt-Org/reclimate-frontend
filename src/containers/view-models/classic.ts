import { DAYS, SETUP } from "@/data/constants"
import type { ClassicFormProps, ClassicSheetsProps, FormField, InputField, SelectField, SourcePickProps } from "@/features/classic/forms"
import type {
  ClassicBiomassProps, ClassicDistributionProps, ClassicDrawerProps, ClassicHomeProps, ClassicMixingProps, ClassicProductionProps,
  ClassicSettingsProps, PendingMark, ProductionCard,
} from "@/features/classic/screens"
import type { ClassicNavItem } from "@/features/classic/ui"
import type { RecordKind } from "@/lib/api/types"
import { fieldProgress, isWet, mediaOf, moistureOf } from "@/lib/batch"
import { L, fill, formatDay, formatTime, m3 } from "@/lib/format"
import { APP_VERSION } from "@/lib/native"
import type { ClassicTab } from "@/store/useArtisanStore"
import type { Batch, MediaItem, MoistureReading, PendingRecord } from "@/types"
import { bioName, profileInfo, statusView, type VMContext } from "./context"
import { burnMedia } from "./other"
import { more } from "./worker"

/**
 * The Classic app's screens, built from the same state as the step-by-step app — the backend's records — so both
 * layouts always show the same data. Builders only turn state into props; the screens are pure.
 */

const media = (v: unknown) => (Array.isArray(v) ? (v as MediaItem[]) : [])
const str = (v: unknown) => (v == null ? "" : String(v))

/** Pending (unsent) records of a kind, newest first, with their waiting/refused mark. */
function pendingOf(ctx: VMContext, kind: RecordKind): (PendingRecord & { mark: PendingMark })[] {
  const { s, a, t } = ctx
  return s.pendingRecords
    .filter((r) => r.kind === kind && (!r.siteId || r.siteId === s.me?.siteId))
    .map((r) => ({
      ...r,
      mark: { waiting: true, error: r.error ? { message: fill(t.notAccepted, { m: r.error }), onRetry: () => a.retryRecord(r.id), onDiscard: () => a.discardRecord(r.id) } : null },
    }))
}

const setupOptions = (ctx: VMContext, key: string, withPending = false) =>
  ctx.a.setupItems(key).filter((i) => withPending || !i.pending).map((i) => ({ value: i.name, label: i.sub ? `${i.name} · ${i.sub}` : i.name }))

/* ---------------- shell ---------------- */

export function buildClassicShell(ctx: VMContext) {
  const { s, a, t, nf } = ctx
  const tab = (key: ClassicTab, icon: ClassicNavItem["icon"], label: string): ClassicNavItem => ({ key, icon, label, active: s.cTab === key, onSelect: () => a.cSetTab(key) })
  const biomassT = (s.stats?.biomass.totalKg ?? 0) / 1000
  return {
    header: {
      site: s.site,
      figure: s.cTab === "biomass" || s.cTab === "production" ? `${nf(biomassT, 2)} t` : null,
      onMenu: () => a.toggleDrawer(true),
      onSite: () => a.openSheet("site"),
      onSupport: a.callSupport,
      menuLabel: t.settingsW,
      supportLabel: t.support,
    },
    nav: [
      tab("home", "house", t.cHome),
      tab("biomass", "truck", t.cBiomass),
      tab("production", "flame-kindling", t.cProduction),
      tab("mixing", "cooking-pot", t.cMixing),
      tab("distribution", "network", t.cDistribution),
    ],
  }
}

/* ---------------- tabs ---------------- */

export function buildClassicHome(ctx: VMContext): ClassicHomeProps {
  const { s, t, nf, lg } = ctx
  const st = s.stats
  const b = st?.biochar
  const shippedByBag = new Map<string, number>()
  return {
    t,
    produced: {
      total: m3(b?.totalL ?? 0, lg),
      approved: m3(b?.approvedL ?? 0, lg),
      rejected: m3(b?.rejectedL ?? 0, lg),
      pending: m3(b?.pendingL ?? 0, lg),
      mixed: m3(b?.mixedL ?? 0, lg),
      shipped: `${nf(b?.shipped.bags ?? 0)} ${t.bagsL.toLowerCase()}`,
      applied: `${nf(b?.applied.bags ?? 0)} ${t.bagsL.toLowerCase()}`,
    },
    biomass: {
      total: `${nf((st?.biomass.totalKg ?? 0) / 1000, 3)} ton`,
      rows: (st?.biomass.byFeedstock ?? []).map((f) => ({ name: f.feedstock, value: `${nf(f.kg / 1000, 3)} ton` })),
    },
    packing: {
      mixed: m3(b?.mixedL ?? 0, lg),
      shipped: `${nf(b?.shipped.bags ?? 0)} ${t.bagsL.toLowerCase()}`,
      rows: (st?.packing ?? []).map((p) => {
        const shipped = p.bags - p.remaining
        shippedByBag.set(p.bag, shipped)
        return { bag: p.bag, packed: `${nf(p.kg)} kg`, bags: p.bags, shipped: `${nf(shipped)}`, shippedBags: shipped }
      }),
    },
  }
}

export function buildClassicBiomass(ctx: VMContext): ClassicBiomassProps {
  const { s, a, t, nf } = ctx
  const pend = pendingOf(ctx, "collections").map((r) => {
    const qty = Number(r.data.qty) || 0
    return {
      id: r.id,
      source: str(r.data.source),
      date: `${formatDay(r.at)} (${formatTime(r.at)})`,
      feedstock: str(r.data.feedstock),
      weight: `${nf(r.data.unit === "ton" ? qty * 1000 : qty)} kg`,
      transport: r.data.transport === "Vehicle" ? t.otherW : t.manualW,
      photo: media(r.data.photos)[0] ?? null,
      mark: r.mark,
    }
  })
  return {
    t,
    totals: (s.stats?.biomass.byFeedstock ?? []).map((f) => ({ name: f.feedstock, value: `${nf(f.kg / 1000, 3)} ton` })),
    items: [
      ...pend,
      ...s.records.collections.map((c) => ({
        id: c.id,
        source: c.source,
        date: `${formatDay(c.date)} (${formatTime(c.date)})`,
        feedstock: c.feedstock,
        weight: `${nf(c.kg)} kg`,
        transport: c.transport === "Vehicle" ? c.vehicle || t.otherW : t.manualW,
        photo: c.photos[0] ?? null,
      })),
    ],
    more: more(ctx, "collections", s.recordPages.collections.hasMore),
    onAdd: () => a.openRecordForm("collections"),
  }
}

/** Day 2's captures shown as "Add …" rows on an ongoing production card (kiln/moisture/timer/litres are elsewhere). */
const PRODUCTION_SKIP = new Set(["kiln", "moist", "burn", "litres", "measure", "sample"])

export function buildClassicProduction(ctx: VMContext): ClassicProductionProps {
  const { s, a, t, lg, nf } = ctx
  const sub = s.cSub.production
  const isSup = s.user === "sup"
  const ongoing = (b: Batch) => b.status === "progress" || !!b.fixing
  const kilnNames = [...new Set(s.batches.map((b) => b.kiln).filter(Boolean))]
  const kiln = s.cKiln && kilnNames.includes(s.cKiln) ? s.cKiln : ""
  const list = s.batches.filter((b) => (sub === "ongoing" ? ongoing(b) : !ongoing(b)) && (!kiln || b.kiln === kiln))
  const fields = DAYS[1].steps.flatMap((st) => st.fields).filter((f) => !PRODUCTION_SKIP.has(f.k))
  const tempFields = fields.filter((f) => f.type === "number")

  const card = (b: Batch): ProductionCard => {
    const steps = [
      ...fields.filter((f) => f.type === "media").map((f) => {
        const p = fieldProgress(f, b)
        return {
          key: f.k,
          icon: (f.type === "media" && f.kind === "video" ? "video" : "image-check") as ProductionCard["steps"][number]["icon"],
          label: `${t.addW} ${L(f.label, lg)} (${p.have ?? 0}/${p.need ?? 0})`,
          done: p.done,
          onPress: () => a.openCamera(b.id, f),
          last: mediaOf(b, f.k).at(-1) ?? null,
        }
      }),
      ...(tempFields.length
        ? [
            {
              key: "temp",
              icon: "thermometer" as const,
              label: `${t.addW} ${t.temperatureT} (${tempFields.filter((f) => fieldProgress(f, b).done).length}/${tempFields.length})`,
              done: tempFields.every((f) => fieldProgress(f, b).done),
              onPress: () => a.openBatchSheet("temp", b.id),
              last: null,
            },
          ]
        : []),
    ]
    const missing = steps.filter((x) => !x.done)
    const burn = b.v.burn ? Number(b.v.burn) : 0
    return {
      id: b.id,
      feedstock: bioName(b, ctx),
      status: statusView(b, ctx).label,
      date: b.date,
      time: burn ? `${formatTime(burn)} - ${b.v.burnEnd ? formatTime(Number(b.v.burnEnd)) : t.inProgressW}` : "",
      biomass: b.kg ? `${nf(b.kg)} kg` : "—",
      biochar: `${nf(b.litres)} ${t.ltr}`,
      media: burnMedia(b),
      ongoing: ongoing(b),
      rejected: b.status === "rejected",
      reason: b.status === "rejected" ? L(b.reason, lg) : null,
      steps,
      missing: missing.length ? fill(t.pleaseUpload, { x: missing.map((x) => x.label.replace(`${t.addW} `, "")).join(", ") }) : null,
      mark: s.dirty.includes(b.id) || s.uploads.some((u) => u.bid === b.id) ? { waiting: true } : undefined,
      onEditQty: ongoing(b) && !isSup ? () => a.openBatchSheet("qty", b.id) : null,
      onMoisture: () => a.openBatchSheet("moisture", b.id),
      onEnd: ongoing(b) ? () => a.openBatchSheet("endBurn", b.id) : null,
      onAccept: isSup && b.status === "waiting" ? () => a.acceptReview(b.id) : null,
      onReject: isSup && b.status === "waiting" ? () => a.openReject(b.id) : null,
      onFix: !isSup && b.status === "rejected" && !b.adminDecision ? () => a.fixBatch(b.id) : null,
    }
  }

  return {
    t,
    sub,
    onSub: (v) => a.cSetSub("production", v),
    kilns: [{ value: "", label: t.allKilns }, ...kilnNames.map((k) => ({ value: k, label: k }))],
    kiln,
    onKiln: (k) => a.cSetKiln(k || null),
    cards: list.map(card),
    more: sub === "ongoing" ? more(ctx, "ongoing", s.batchPages.ongoing.hasMore) : more(ctx, "all", s.batchPages.all.hasMore),
    onStart: () => a.openRecordForm("start"),
  }
}

const isOnlyBiochar = (type: string) => /biochar[\s-]*only|^open$/i.test(type)

export function buildClassicMixing(ctx: VMContext): ClassicMixingProps {
  const { s, a, t, nf, lg } = ctx
  const b = s.stats?.biochar
  const packing = s.cSub.packing
  const pendMix = pendingOf(ctx, "mixings").map((r) => ({
    id: r.id,
    mixType: str(r.data.mixType),
    qty: str(r.data.otherKg || "0"),
    total: `${str(r.data.totalKg || "0")} kg`,
    volume: `${str(r.data.biocharL)} ${t.ltr}`,
    date: formatDay(r.at),
    media: media(r.data.photos),
    mark: r.mark,
  }))
  const pendPack = pendingOf(ctx, "packagings").map((r) => ({
    id: r.id,
    type: str(r.data.packagingType),
    bag: str(r.data.bag),
    bags: str(r.data.bags),
    qty: r.data.quantityKg ? `${str(r.data.quantityKg)} kg` : "",
    date: formatDay(r.at),
    media: media(r.data.photos),
    mark: r.mark,
  }))
  return {
    t,
    sub: s.cSub.mixing,
    onSub: (v) => a.cSetSub("mixing", v),
    hideMixing: !!s.rules?.hideMixingTab,
    available: { approved: `${m3(s.stats?.available.biocharL ?? 0, lg)} m³`, pending: `${m3(b?.pendingL ?? 0, lg)} m³` },
    mixings: [
      ...pendMix,
      ...s.records.mixings.map((m) => ({
        id: m.id,
        mixType: m.mixType,
        qty: nf(m.otherKg),
        total: `${nf(m.totalKg, 2)} kg`,
        volume: `${nf(m.biocharL)} ${t.ltr}`,
        date: formatDay(m.date),
        media: [...m.photos, ...m.videos],
      })),
    ],
    packing,
    onPacking: (v) => a.cSetSub("packing", v),
    packSummary: { only: `${m3(s.stats?.available.biocharL ?? 0, lg)} m³`, mixed: `${m3(b?.mixedL ?? 0, lg)} m³` },
    packagings: [
      ...pendPack.filter((x) => isOnlyBiochar(x.type) === (packing === "only")),
      ...s.records.packagings
        .filter((x) => isOnlyBiochar(x.packagingType) === (packing === "only"))
        .map((x) => ({
          id: x.id,
          type: x.packagingType,
          bag: x.bag,
          bags: `${nf(x.bags)} (${fill(t.bagsLeft, { n: nf(x.bagsRemaining) })})`,
          qty: x.biocharKg || x.mixKg ? `${nf(x.biocharKg || x.mixKg)} kg` : "",
          date: formatDay(x.date),
          media: [...x.photos, ...x.videos],
        })),
    ],
    moreMixings: more(ctx, "mixings", s.recordPages.mixings.hasMore),
    morePackagings: more(ctx, "packagings", s.recordPages.packagings.hasMore),
    onAddMixing: () => a.openRecordForm("mixings"),
    onAddPackaging: () => a.openRecordForm("packagings", { packagingType: packing === "only" ? "Biochar only" : "" }),
  }
}

export function buildClassicDistribution(ctx: VMContext): ClassicDistributionProps {
  const { s, a, t, nf, lg } = ctx
  const sub = s.cSub.distribution
  const receivers = s.cSub.receivers
  const buyers = new Set(a.setupItems("buyers").map((b) => b.name))
  const canOpen = !!s.rules?.canApplyOpenBiochar
  // What can be handed out: packed bags with some left, mixed product, and (if allowed) open biochar.
  const stock: ClassicDistributionProps["stock"] = [
    ...(s.stats?.mixing.byType ?? []).map((m) => ({
      key: `mix:${m.type}`,
      label: m.type,
      amount: `${nf(m.kg, 2)} kg`,
      onAdd: () => a.openRecordForm("applications", { kind: "application", mixType: m.type, unit: "kg" }),
    })),
    ...(s.stats?.packing ?? [])
      .filter((p) => p.remaining > 0)
      .map((p) => ({
        key: `bag:${p.type}:${p.bag}`,
        label: `${p.bag} ${p.type}`,
        amount: `${nf(p.remaining)} ${t.bagsL.toLowerCase()}`,
        onAdd: () => a.openRecordForm("applications", { kind: "application", mixType: p.type, bagType: p.bag }),
      })),
    {
      key: "open",
      label: t.biocharOnly,
      amount: `${nf(s.stats?.available.biocharL ?? 0)} ${t.ltr}`,
      onAdd: canOpen ? () => a.openRecordForm("applications", { kind: "application", mixType: "Biochar only", unit: "L" }) : null,
    },
  ]
  const isBuyer = (name: string) => buyers.has(name)
  const keep = (kind: string, recipient: string) => kind === sub && (sub === "application" || isBuyer(recipient) === (receivers === "buyer"))
  const amount = (q: unknown, unit: unknown, bags: unknown, bagType: unknown) =>
    [q ? `${nf(Number(q), 2)} ${str(unit) || "kg"}` : "", bags ? `${nf(Number(bags))} × ${str(bagType) || t.bagW}` : ""].filter(Boolean).join(" · ")
  const sh = s.stats?.biochar.shipped
  return {
    t,
    sub,
    onSub: (v) => a.cSetSub("distribution", v),
    receivers,
    onReceivers: (v) => a.cSetSub("receivers", v),
    stock,
    summary: `${t.bagsL}: ${nf(sh?.bags ?? 0)} | ${t.quantityL}: ${nf(sh?.kg ?? 0)} kg${sh?.litres ? ` · ${m3(sh.litres, lg)} m³` : ""}`,
    items: [
      ...pendingOf(ctx, "applications")
        .filter((r) => keep(str(r.data.kind) || "application", str(r.data.recipient)))
        .map((r) => ({ id: r.id, title: str(r.data.recipient), sub: str(r.data.mixType), amount: amount(r.data.quantity, r.data.unit, r.data.bags, r.data.bagType), date: formatDay(r.at), media: media(r.data.photos), mark: r.mark })),
      ...s.records.applications
        .filter((x) => keep(x.kind, x.recipient))
        .map((x) => ({ id: x.id, title: x.recipient, sub: [x.mixType, x.address].filter(Boolean).join(" · "), amount: amount(x.quantity, x.unit, x.bags, x.bagType), date: formatDay(x.date), media: [...x.photos, ...x.videos] })),
    ],
    more: more(ctx, "applications", s.recordPages.applications.hasMore),
    onAdd: () => a.openRecordForm("applications", { kind: "distribution" }),
  }
}

/* ---------------- drawer, settings ---------------- */

export function buildClassicDrawer(ctx: VMContext): ClassicDrawerProps {
  const { s, a, t, lg } = ctx
  const p = profileInfo(ctx)
  return {
    t,
    open: s.drawer,
    name: p.name,
    initials: p.initials,
    photo: p.photo,
    site: s.site,
    role: p.roleLabel,
    slow: s.slow,
    pendingUploads: s.uploads.length + s.pendingRecords.length,
    setupItems: SETUP.map((c, i) => ({ key: c.key, label: L(c.name, lg), onOpen: () => a.openSetupList(i) })),
    version: fill(t.versionW, { v: APP_VERSION }),
    onToggleSlow: a.toggleSlow,
    onChangeNetwork: s.sites.length > 1 ? () => a.openSheet("site") : null,
    onSupervisors: () => a.openClassicView("sups"),
    onUploads: () => a.openClassicView("uploads"),
    onSettings: () => a.openClassicView("settings"),
    onClose: () => a.toggleDrawer(false),
  }
}

export function buildClassicSettings(ctx: VMContext): ClassicSettingsProps {
  const { s, a, t } = ctx
  const p = profileInfo(ctx)
  return {
    t,
    name: p.name,
    phone: p.phone,
    email: p.email,
    role: p.roleLabel,
    site: s.site,
    initials: p.initials,
    photo: p.photo,
    language: s.lang === "id" ? "Bahasa Indonesia" : "English",
    ui: s.ui,
    onUi: (ui) => a.setAccountType(ui === "classic" ? "existing" : "new"),
    onPhoto: () => a.openSheet("photo"),
    onEdit: a.openEditProfile,
    onLanguage: () => a.openSheet("language"),
    onLogout: () => a.openSheet("logout"),
    onPrivacy: () => a.openLink("privacy"),
    onTerms: () => a.openLink("terms"),
    onDeleteAccount: () => a.openSheet("deleteAccount"),
    onBack: a.closeView,
  }
}

/* ---------------- forms ---------------- */

export function buildSourcePick(ctx: VMContext): SourcePickProps | null {
  const { s, a, t } = ctx
  if (s.view !== "sourcePick" || !s.recordForm) return null
  return {
    t,
    sources: a.setupItems("sources").map((x) => ({ name: x.name, sub: x.sub })),
    farmers: a.setupItems("farmers").map((x) => ({ name: x.name, sub: x.sub })),
    onPick: a.pickSource,
    onAddNew: () => a.openAdd("sources", { bid: "form", k: "source" }),
    onBack: a.cancelRecordForm,
  }
}

export function buildClassicForm(ctx: VMContext): ClassicFormProps | null {
  const { s, a, t } = ctx
  const f = s.recordForm
  if (s.view !== "recordForm" || !f) return null
  const d = f.data
  const r = s.rules
  const set = (k: string) => (v: string) => a.setFormField(k, v)
  const text = (key: string, label: string, type: "text" | "number" | "tel" = "text", extra: Partial<InputField> = {}): FormField => ({ type, key, label, value: str(d[key]), onChange: set(key), ...extra })
  const select = (key: string, label: string, options: { value: string; label: string; disabled?: boolean }[], extra: Partial<SelectField> = {}): FormField => ({ type: "select", key, label, value: str(d[key]), options, onChange: set(key), ...extra })
  const photos = (label: string, need: number): FormField => ({
    type: "media", key: "photos", label, kind: "photo", required: need > 0, items: media(d.photos),
    onAdd: () => a.formCamera("photos", "photo", need, { en: label, id: label }), onRemove: (id) => a.removeFormMedia("photos", id),
  })
  const videos = (label: string): FormField => ({
    type: "media", key: "videos", label, kind: "video", required: false, items: media(d.videos),
    onAdd: () => a.formCamera("videos", "video", 1, { en: label, id: label }), onRemove: (id) => a.removeFormMedia("videos", id),
  })
  const feedstocks = s.feedstocks.map((x) => ({ value: x.name, label: x.name }))
  const mixOptions = s.mixingTypes.map((m) => ({ value: m, label: m }))
  const transport = [{ value: "Manual", label: t.manualW }, { value: "Vehicle", label: t.otherW }]
  const base = { t, onSubmit: a.submitRecordForm, onBack: a.cancelRecordForm }

  switch (f.kind) {
    case "collections":
      return {
        ...base,
        title: t.addBiomass,
        submitLabel: t.continueW,
        fields: [
          text("source", t.sourceName, "text", { readOnly: true }),
          { type: "toggle", key: "transport", label: t.modeTransport, value: str(d.transport) || "Manual", options: transport, onChange: set("transport") },
          ...(d.transport === "Vehicle" ? [select("vehicle", t.pickVehicle.replace(/\.$/, ""), setupOptions(ctx, "vehicles"))] : []),
          select("feedstock", t.biomassType, feedstocks),
          text("qty", t.biomassQty, "number", { units: { value: str(d.unit) || "kg", options: ["kg", "ton"], onChange: set("unit") } }),
          photos(t.addBiomassImages, r?.photos.biomass ?? 0),
        ],
      }
    case "start": {
      const rows = (d.moist as unknown as MoistureReading[]) ?? []
      const n = r?.moisture.required ? r.moisture.readings : 0
      const kilns = a.setupItems("kilns").map((k) => ({ value: k.name, label: k.pending ? `${k.name} (${t.pendingApproval})` : k.name, disabled: !!k.pending }))
      return {
        ...base,
        title: t.startProcess,
        submitLabel: t.startProcess,
        fields: [
          select("btype", t.selectBiomass, feedstocks),
          select("kiln", t.selectKiln, kilns),
          ...(n
            ? [
                {
                  type: "moist" as const,
                  key: "moist",
                  label: fill(t.moistureContent, { n }),
                  rows: Array.from({ length: n }, (_, i) => ({
                    value: rows[i]?.val ?? "",
                    wet: isWet(rows[i]?.val ?? ""),
                    photo: rows[i]?.ph ?? null,
                    onChange: (v: string) => a.setFormMoisture(i, v),
                    onPhoto: () => a.formCamera("moist", "photo", 1, { en: `Moisture ${i + 1}`, id: `Kelembapan ${i + 1}` }, i),
                  })),
                  warn: rows.some((x) => x && isWet(x.val)) ? fill(t.tooWet, { m: r?.moisture.max ?? "" }) : null,
                },
              ]
            : []),
        ],
      }
    }
    case "mixings":
      return {
        ...base,
        title: t.addMixing,
        submitLabel: t.create,
        fields: [
          select("mixType", t.selectMixType, mixOptions),
          select("feedstock", t.selectBiocharType, feedstocks),
          text("biocharL", t.enterBiocharQty, "number", { suffix: t.ltr }),
          { type: "note", key: "avail", text: fill(t.availableQty, { n: ctx.nf(s.stats?.available.biocharL ?? 0) }) },
          text("otherKg", t.otherMaterial, "number", { suffix: "kg" }),
          text("totalKg", t.totalMixed, "number", { suffix: "kg" }),
          text("note", t.noteW, "text", { multiline: true }),
          photos(t.addImages, r?.photos.mixing ?? 0),
          videos(t.addVideos),
        ],
      }
    case "packagings":
      return {
        ...base,
        title: t.addPackaging,
        submitLabel: t.create,
        fields: [
          select("packagingType", t.selectPackagingType, [{ value: "Biochar only", label: t.biocharOnly }, ...mixOptions]),
          select("bag", t.selectBag, [...setupOptions(ctx, "bags"), ...(r?.canApplyOpenBiochar ? [{ value: "Open", label: t.openBag }] : [])]),
          text("bags", t.numBags, "number"),
          text("quantityKg", t.packedQty, "number", { suffix: "kg" }),
          text("note", t.noteW, "text", { multiline: true }),
          photos(t.addImages, r?.photos.packing ?? 0),
          videos(t.addVideos),
        ],
      }
    case "applications": {
      const distribution = d.kind === "distribution"
      const people = distribution && s.cSub.receivers === "buyer" ? setupOptions(ctx, "buyers") : setupOptions(ctx, "farmers")
      return {
        ...base,
        title: distribution ? t.addDistribution : t.addApplication,
        submitLabel: t.create,
        fields: [
          select("recipient", t.selectRecipient, people),
          select("mixType", t.productL, [...mixOptions, ...(r?.canApplyOpenBiochar ? [{ value: "Biochar only", label: t.biocharOnly }] : [])]),
          select("bagType", t.selectBag, setupOptions(ctx, "bags")),
          text("bags", t.bagsL, "number"),
          text("quantity", t.quantityL, "number", { suffix: str(d.unit) || "kg" }),
          { type: "toggle", key: "mode", label: t.modeTransport, value: str(d.mode) || "Manual", options: transport, onChange: set("mode") },
          ...(d.mode === "Vehicle" ? [select("vehicle", t.pickVehicle.replace(/\.$/, ""), setupOptions(ctx, "vehicles"))] : []),
          text("phone", t.phoneOpt, "tel"),
          text("address", t.addressL),
          { type: "location", key: "loc", label: t.saveLocationW, value: d.lat != null ? `${Number(d.lat).toFixed(5)}, ${Number(d.lng).toFixed(5)}` : "", onCapture: a.formLocation },
          photos(t.addImages, r?.photos.application ?? 0),
        ],
      }
    }
  }
}

/* ---------------- sheets ---------------- */

export function buildClassicSheets(ctx: VMContext): ClassicSheetsProps {
  const { s, a, t, lg } = ctx
  const b = s.batches.find((x) => x.id === s.sheetBatch)
  const v = s.sheetValues
  const set = (k: string) => (val: string) => a.setSheetValue(k, val)
  const tempFields = DAYS[1].steps.flatMap((st) => st.fields).filter((f) => f.type === "number" && /^temp\d*$/.test(f.k))
  const entryOpen = (s.sheet === "temp" || s.sheet === "endBurn" || s.sheet === "qty") && !!b
  const fields: FormField[] =
    s.sheet === "temp"
      ? tempFields.map((f) => ({ type: "number", key: f.k, label: L(f.label, lg), value: v[f.k] ?? "", onChange: set(f.k), suffix: "°C" }))
      : s.sheet === "endBurn"
        ? [
            { type: "number", key: "litres", label: t.biocharQty, value: v.litres ?? "", onChange: set("litres"), suffix: "L" },
            { type: "select", key: "measure", label: SETUP.find((c) => c.key === "measure") ? L(SETUP.find((c) => c.key === "measure")!.name, lg) : "", value: v.measure ?? "", options: setupOptions(ctx, "measure"), onChange: set("measure") },
            { type: "select", key: "sample", label: SETUP.find((c) => c.key === "sample") ? L(SETUP.find((c) => c.key === "sample")!.name, lg) : "", value: v.sample ?? "", options: setupOptions(ctx, "sample"), onChange: set("sample") },
          ]
        : s.sheet === "qty"
          ? [{ type: "number", key: "qty", label: t.biomassQty, value: v.qty ?? "", onChange: set("qty"), suffix: "kg" }]
          : []
  const minTemp = s.rules?.temperature.min
  const moist = b ? moistureOf(b) : []
  return {
    t,
    moisture: {
      open: s.sheet === "moisture" && !!b,
      title: t.moistureT,
      time: b?.v.burn ? `${b.kg ? `${t.biomassQty}: ${ctx.nf(b.kg)} kg · ` : ""}${formatTime(Number(b.v.burn))}` : "",
      rows: moist.map((m) => ({ value: m.val, wet: isWet(m.val), photo: m.ph })),
      onClose: a.closeSheet,
    },
    entry: {
      open: entryOpen,
      title: s.sheet === "temp" ? t.temperatureT : s.sheet === "endBurn" ? t.endProcess : t.editQty,
      note: s.sheet === "temp" && minTemp ? fill(t.minTemp, { n: minTemp }) : s.sheet === "endBurn" ? t.endProcessSub : null,
      fields,
      onSave: a.saveSheet,
      onClose: a.closeSheet,
    },
    language: {
      open: s.sheet === "language",
      value: s.lang,
      options: [
        { value: "en", label: "English" },
        { value: "id", label: "Bahasa Indonesia" },
      ],
      onPick: (l) => a.setLang(l as "en" | "id"),
      onClose: a.closeSheet,
    },
  }
}
