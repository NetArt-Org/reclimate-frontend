import type { Batch, MediaItem, Role, SetupItem } from "@/types"

/**
 * What the backend's field API sends (see the backend's src/field/). The backend is the single source of truth:
 * every list, rule, limit and figure the app shows comes from these shapes. Plain English data; the app
 * translates only its own labels.
 */

/** A page of a list; ask for the next page while `hasMore`. */
export interface Page<T> {
  items: T[]
  page: number
  hasMore: boolean
  total: number
}

/** Per-network field rules and limits, set by the admin (Settings → Field app settings). */
export interface FieldRules {
  moisture: { required: boolean; max: number; readings: number }
  temperature: { required: boolean; min: number; readings: number }
  minFiringImages: number
  recordVideo: boolean
  minFiringVideos: number
  minVideoSeconds: number
  canApplyOpenBiochar: boolean
  hideMixingTab: boolean
  quenchSteps: string[]
  photos: { biomass: number; mixing: number; packing: number; application: number }
  credits: { price: number; currency: string; payoutGoal: number }
  supportPhone: string
}

export interface FeedstockInfo {
  name: string
  bulkDensity: number | null
  carbonContent: number | null
  /** Estimated credits (t CO₂e) per litre of biochar. */
  creditsPerL: number | null
}

export interface RejectReason {
  key: string
  label: string
  /** Wizard slot cleared so the worker captures it again. */
  redo: string
}

export interface ServerSetupList extends Page<SetupItem> {
  key: string
}

export type ServerBatch = Omit<Batch, "reason" | "fixStep" | "fixClear" | "siteId"> & { remoteId: string; reasonText?: string }

export interface ServerPerson {
  id: string
  name: string
  role: Role
  /** manager | supervisor | operator | farmer */
  fieldRole: string
  email: string
  phone: string
  village: string
  photo: MediaItem | null
  mustChangePassword: boolean
}

export interface Flow {
  litres: number
  kg: number
  bags: number
  count: number
}

export interface SiteStats {
  biochar: { totalL: number; approvedL: number; rejectedL: number; pendingL: number; mixedL: number; shipped: Flow; applied: Flow }
  batches: { inProgress: number; waiting: number; approved: number; rejected: number; total: number }
  biomass: { totalKg: number; collections: number; byFeedstock: { feedstock: string; kg: number; count: number }[] }
  mixing: { byType: { type: string; biocharL: number; kg: number; count: number }[]; count: number }
  packing: { type: string; bag: string; bags: number; remaining: number; kg: number }[]
  available: { biocharL: number }
  trend: { day: string; litres: number }[]
}

/* ---- records (Classic app tabs) ---- */

interface RecordMedia {
  photos: MediaItem[]
  videos: MediaItem[]
}
export interface CollectionRecord extends RecordMedia {
  id: string
  date: string
  source: string
  feedstock: string
  kg: number
  transport: "Manual" | "Vehicle"
  vehicle: string
}
export interface MixingRecord extends RecordMedia {
  id: string
  date: string
  mixType: string
  feedstock: string
  biocharL: number
  otherKg: number
  totalKg: number
  note: string
}
export interface PackagingRecord extends RecordMedia {
  id: string
  date: string
  packagingType: string
  bag: string
  bags: number
  bagsRemaining: number
  biocharKg: number
  mixKg: number
  note: string
}
export interface ApplicationRecord extends RecordMedia {
  id: string
  date: string
  kind: "application" | "distribution"
  recipient: string
  phone: string
  address: string
  lat: number | null
  lng: number | null
  mixType: string
  quantity: number | null
  unit: string
  bags: number | null
  bagType: string
  mode: "Manual" | "Vehicle"
  vehicle: string
}

export type RecordKind = "collections" | "mixings" | "packagings" | "applications"
export interface RecordMap {
  collections: CollectionRecord
  mixings: MixingRecord
  packagings: PackagingRecord
  applications: ApplicationRecord
}

export interface HistoryEntry {
  kind: "earned" | "sold" | "requested" | "declined"
  title: string
  date: string
  amount: number
}

export interface Supervisor {
  id: string
  name: string
  role: string
  phone: string
}

export interface Bootstrap {
  person: ServerPerson
  sites: { id: string; name: string; active: boolean }[]
  siteId: string | null
  network: { id: string; name: string; type: string } | null
  rules: FieldRules
  feedstocks: FeedstockInfo[]
  mixingTypes: string[]
  applicationTypes: string[]
  rejectReasons: RejectReason[]
  settings: {
    pageSize: number
    uploadLimits: { photo: number; video: number }
    latestAppVersion: string
    /** Oldest version the backend still serves (older builds must update); null = any. */
    minAppVersion?: string | null
    /** Where to update the app (Play Store listing). */
    storeUrl?: string
    /** The backend's public pages the app links to. */
    privacyUrl: string
    termsUrl: string
    deletionUrl: string
  }
  setup: ServerSetupList[]
  supervisors: Page<Supervisor>
  batches: Page<ServerBatch>
  /** Supervisors: the first page of batches waiting for review. */
  queue: Page<ServerBatch> | null
  /** Burns still going (first page). */
  ongoing: Page<ServerBatch>
  records: { [K in RecordKind]: Page<RecordMap[K]> }
  credits: { earned: number; sold: number; pending: number }
  history: Page<HistoryEntry>
  stats: SiteStats
}

/* ---- Register now ---- */

export interface RegisterOptions {
  roles: { value: string; label: string }[]
  networks: { id: string; name: string; sites: { id: string; name: string }[] }[]
}

export type RegistrationStatus = "none" | "pending" | "approved" | "rejected"

export interface RegisterStatusReply {
  status: RegistrationStatus
  email: string
  name: string
  note?: string
}

/** Why the backend refused to open the app for this account (see the backend's FieldErrorCode). */
export type AccessCode =
  | "signed_out" | "not_registered" | "pending" | "rejected" | "access_off" | "no_site" | "not_configured"
  | "rate_limited" | "email_unverified" | "duplicate" | "update_required"
