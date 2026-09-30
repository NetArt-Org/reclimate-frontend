import type { AppData } from "@/data/app-data"
import { REJECT_REASONS } from "@/data/constants"
import { mediaOf, moistureOf } from "@/lib/batch"
import { nameParts } from "@/lib/format"
import type {
  Batch, BatchStatus, BatchValues, CreditHistoryEntry, Localized, MediaItem, MoistureReading, Profile, Role,
  Session, SetupList, Supervisor,
} from "@/types"

/* ------------------------------------------------------------------ */
/* Backend document shapes (only the fields the app reads)             */
/* ------------------------------------------------------------------ */

type Rel<T> = number | T | null | undefined

export interface ServerMedia {
  id: number
  url?: string | null
  mimeType?: string | null
  sizes?: { thumbnail?: { url?: string | null } }
}

export interface ServerSite {
  id: number
  name: string
}

export interface ServerUser {
  id: number
  name: string
  role: "admin" | "supervisor" | "worker"
  phone?: string | null
  village?: string | null
  email?: string | null
  lang?: "en" | "id" | null
  jobTitle?: Localized | null
  site?: Rel<ServerSite>
  avatar?: Rel<ServerMedia>
}

export interface ServerBatch {
  id: number
  code: string
  status: BatchStatus
  day: number
  step: number
  startedAt?: string | null
  worker?: Rel<ServerUser>
  collect?: {
    source?: string | null
    biomassType?: string | null
    quantity?: number | null
    unit?: "kg" | "ton" | null
    weightKg?: number | null
    transport?: "manual" | "vehicle" | null
    photos?: Rel<ServerMedia>[] | null
  }
  burn?: {
    kiln?: string | null
    moisture?: { value?: number | null; photo?: Rel<ServerMedia> }[] | null
    startedAt?: string | null
    endedAt?: string | null
    firingPhotos?: Rel<ServerMedia>[] | null
    firingVideos?: Rel<ServerMedia>[] | null
    temperatureC?: number | null
    preQuenchPhotos?: Rel<ServerMedia>[] | null
    quenchPhotos?: Rel<ServerMedia>[] | null
    litres?: number | null
  }
  mix?: {
    mixType?: "compost-1-1" | "biochar-only" | null
    biocharUsedL?: number | null
    photos?: Rel<ServerMedia>[] | null
    bagType?: string | null
    bagCount?: number | null
    packPhotos?: Rel<ServerMedia>[] | null
  }
  apply?: {
    receiver?: string | null
    bagsGiven?: number | null
    photos?: Rel<ServerMedia>[] | null
    latitude?: number | null
    longitude?: number | null
    locationLabel?: string | null
  }
  review?: {
    reviewedBy?: Rel<ServerUser>
    rejectReason?: string | null
    rejectNote?: string | null
  }
}

export interface ServerSetupItem {
  id: number
  category: string
  name: string
  detail?: string | null
}

export interface ServerTransaction {
  id: number
  type: "earned" | "sold" | "adjustment"
  amount: number
  date: string
  title?: Localized | null
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const populated = <T extends { id: number }>(v: Rel<T>): T | null => (v && typeof v === "object" ? v : null)

const pad = (n: number) => String(n).padStart(2, "0")

/** ISO date → dd/mm/yyyy, the format every screen shows. */
export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return ""
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

const num = (v: unknown): number | null => {
  const n = parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : null
}
const text = (v: unknown): string | null => (v == null || v === "" ? null : String(v))
const iso = (v: unknown): string | null => (v ? new Date(Number(v)).toISOString() : null)

/** The app's wizard values ↔ the backend's option values. */
const TRANSPORT = { Manual: "manual", Vehicle: "vehicle" } as const
const MIX = { "Biochar-Compost 1:1": "compost-1-1", "Biochar only": "biochar-only" } as const
const flip = <K extends string, V extends string>(o: Record<K, V>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k])) as Record<V, K>
const TRANSPORT_BACK = flip(TRANSPORT)
const MIX_BACK = flip(MIX)

/* ------------------------------------------------------------------ */
/* Backend → app                                                       */
/* ------------------------------------------------------------------ */

export const mediaFromServer = (m: ServerMedia): MediaItem => ({
  id: `m${m.id}`,
  pend: false,
  kind: m.mimeType?.startsWith("video") ? "video" : "photo",
  remoteId: m.id,
  url: m.url ?? undefined,
  thumb: m.sizes?.thumbnail?.url ?? undefined,
})

const mediaList = (arr: Rel<ServerMedia>[] | null | undefined): MediaItem[] =>
  (arr ?? []).map(populated).filter((m): m is ServerMedia => !!m).map(mediaFromServer)

export const roleFromServer = (role: ServerUser["role"]): Role | null =>
  role === "worker" ? "worker" : role === "supervisor" ? "sup" : null

export const sessionFromServer = (u: ServerUser): Session | null => {
  const role = roleFromServer(u.role)
  if (!role) return null
  const site = u.site
  return { id: u.id, role, siteId: typeof site === "object" ? (site?.id ?? null) : (site ?? null) }
}

export const profileFromServer = (u: ServerUser): Profile => ({
  name: u.name,
  phone: u.phone ?? "",
  village: u.village ?? "",
  email: u.email ?? "",
})

export const supervisorFromServer = (u: ServerUser): Supervisor => ({
  name: u.name,
  ini: nameParts(u.name).initials,
  role: u.jobTitle ?? { en: "Supervisor", id: "Supervisor" },
  phone: u.phone ?? "",
})

export function batchFromServer(d: ServerBatch): Batch {
  const c = d.collect ?? {}
  const bn = d.burn ?? {}
  const mx = d.mix ?? {}
  const ap = d.apply ?? {}
  const rv = d.review ?? {}

  const v: BatchValues = {}
  const put = (k: string, val: string | number | null | undefined) => {
    if (val != null && val !== "") v[k] = typeof val === "number" ? String(val) : val
  }
  const putMedia = (k: string, arr: Rel<ServerMedia>[] | null | undefined) => {
    const items = mediaList(arr)
    if (items.length) v[k] = items
  }

  put("source", c.source)
  put("btype", c.biomassType)
  put("qty", c.quantity)
  if (c.quantity != null) v.unit = c.unit ?? "kg"
  put("transport", c.transport ? TRANSPORT_BACK[c.transport] : null)
  putMedia("bphoto", c.photos)

  put("kiln", bn.kiln)
  if (bn.moisture?.length) {
    v.moist = bn.moisture.map((r): MoistureReading => {
      const photo = populated(r.photo)
      return { val: r.value == null ? "" : String(r.value), ph: photo ? mediaFromServer(photo) : null }
    })
  }
  if (bn.startedAt) v.burn = new Date(bn.startedAt).getTime()
  if (bn.endedAt) v.burnEnd = new Date(bn.endedAt).getTime()
  putMedia("firePh", bn.firingPhotos)
  putMedia("fireVid", bn.firingVideos)
  put("temp", bn.temperatureC)
  putMedia("preq", bn.preQuenchPhotos)
  putMedia("quench", bn.quenchPhotos)
  put("litres", bn.litres)

  put("mixType", mx.mixType ? MIX_BACK[mx.mixType] : null)
  put("mixL", mx.biocharUsedL)
  putMedia("mixPh", mx.photos)
  put("bag", mx.bagType)
  put("bags", mx.bagCount)
  putMedia("packPh", mx.packPhotos)

  put("to", ap.receiver)
  put("giveBags", ap.bagsGiven)
  putMedia("applyPh", ap.photos)
  put("loc", ap.locationLabel)
  if (ap.latitude != null) v.lat = ap.latitude
  if (ap.longitude != null) v.lng = ap.longitude

  const batch: Batch = {
    id: d.code,
    remoteId: d.id,
    status: d.status,
    day: d.day,
    step: d.step,
    date: formatDate(d.startedAt),
    // Summary fields the app fills in when a day is completed.
    bio: d.day > 1 ? (c.biomassType ?? "") : "",
    kg: d.day > 1 ? (c.weightKg ?? 0) : 0,
    kiln: bn.kiln ?? "",
    litres: d.day > 2 ? (bn.litres ?? 0) : 0,
    v,
  }

  const worker = populated(d.worker)
  if (worker) batch.workerName = worker.name
  const reviewer = populated(rv.reviewedBy)
  if (reviewer && d.status !== "progress" && d.status !== "waiting") batch.by = nameParts(reviewer.name).short

  const reason = d.status === "rejected" ? REJECT_REASONS.find((r) => r.k === rv.rejectReason) : undefined
  if (d.status === "rejected") {
    const suffix = rv.rejectNote ? ` · ${rv.rejectNote}` : ""
    batch.rejectKey = rv.rejectReason ?? null
    batch.rejectNote = rv.rejectNote ?? ""
    batch.reason = reason
      ? { en: reason.en + suffix, id: reason.id + suffix }
      : { en: rv.rejectNote || "Rejected", id: rv.rejectNote || "Ditolak" }
    batch.fixStep = reason?.step
    batch.fixClear = reason?.clear
  }
  return batch
}

export const setupFromServer = (items: ServerSetupItem[], current: SetupList[]): SetupList[] =>
  current.map((list) => ({
    key: list.key,
    items: items
      .filter((i) => i.category === list.key)
      .map((i) => ({ id: String(i.id), name: i.name, sub: i.detail ?? "" })),
  }))

export function creditsFromServer(rows: ServerTransaction[]): Pick<AppData, "credits" | "history"> {
  const earned = rows.filter((r) => r.amount > 0).reduce((a, r) => a + r.amount, 0)
  const sold = -rows.filter((r) => r.amount < 0).reduce((a, r) => a + r.amount, 0)
  const history: CreditHistoryEntry[] = rows.map((r) => ({
    icon: r.amount < 0 ? "hand-coins" : "plus",
    title: r.title ?? "",
    date: formatDate(r.date),
    amt: r.amount,
  }))
  return { credits: { earned, sold }, history }
}

/* ------------------------------------------------------------------ */
/* App → backend                                                       */
/* ------------------------------------------------------------------ */

/** Ids of files already on the server; ones still uploading are added on a later save. */
const ids = (b: Batch, k: string) =>
  mediaOf(b, k)
    .map((m) => m.remoteId)
    .filter((id): id is number => id != null)

/** A supervisor only ever changes the decision — never the worker's record. */
export const reviewToServer = (b: Batch) => ({
  status: b.status,
  review: { rejectReason: b.status === "rejected" ? (b.rejectKey ?? null) : null, rejectNote: b.rejectNote || null },
})

export function batchToServer(b: Batch) {
  const v = b.v
  const rows = moistureOf(b)
  const lastRow = rows.reduce((last, r, i) => (r && (r.val !== "" || r.ph) ? i : last), -1)
  return {
    code: b.id,
    status: b.status,
    day: b.day,
    step: b.step,
    collect: {
      source: text(v.source),
      biomassType: text(v.btype),
      quantity: num(v.qty),
      unit: v.unit === "ton" ? "ton" : "kg",
      transport: TRANSPORT[v.transport as keyof typeof TRANSPORT] ?? null,
      photos: ids(b, "bphoto"),
    },
    burn: {
      kiln: text(v.kiln),
      moisture: rows.slice(0, lastRow + 1).map((r) => ({ value: num(r?.val), photo: r?.ph?.remoteId ?? null })),
      startedAt: iso(v.burn),
      endedAt: iso(v.burnEnd),
      firingPhotos: ids(b, "firePh"),
      firingVideos: ids(b, "fireVid"),
      temperatureC: num(v.temp),
      preQuenchPhotos: ids(b, "preq"),
      quenchPhotos: ids(b, "quench"),
      litres: num(v.litres),
    },
    mix: {
      mixType: MIX[v.mixType as keyof typeof MIX] ?? null,
      biocharUsedL: num(v.mixL),
      photos: ids(b, "mixPh"),
      bagType: text(v.bag),
      bagCount: num(v.bags),
      packPhotos: ids(b, "packPh"),
    },
    apply: {
      receiver: text(v.to),
      bagsGiven: num(v.giveBags),
      photos: ids(b, "applyPh"),
      latitude: num(v.lat),
      longitude: num(v.lng),
      locationLabel: text(v.loc),
    },
  }
}
