import type { IconName } from "@/components/common/Icon"
import type { FieldRules, HistoryEntry, RejectReason } from "@/lib/api/types"

export type { FieldRules, HistoryEntry, RejectReason }

export type Lang = "en" | "id"
export type Role = "worker" | "sup"

/** A plain string, or a per-language pair. */
export type Localized = string | { en: string; id: string }

/* ------------------------------------------------------------------ */
/* Batches                                                             */
/* ------------------------------------------------------------------ */

export type BatchStatus = "progress" | "waiting" | "approved" | "rejected" | "done"

export interface MediaItem {
  id: string
  /** Still on this phone — waiting in the upload queue. */
  pend: boolean
  kind?: "photo" | "video"
  /** Set once the file is on the server. */
  remoteId?: string
  url?: string
  thumb?: string
}

export interface MoistureReading {
  val: string
  ph: MediaItem | null
}

/** Values captured by the wizard, keyed by FieldDef.k */
export interface BatchValues {
  [key: string]: string | number | MediaItem[] | MoistureReading[] | undefined
}

export interface Batch {
  id: string
  bio: string
  kg: number
  kiln: string
  date: string
  status: BatchStatus
  /** Current day 1‥4, or 5 once every day is complete. */
  day: number
  /** Furthest unlocked step within the current day. */
  step: number
  litres: number
  v: BatchValues
  by?: string
  reason?: Localized | null
  fixStep?: number
  fixClear?: string
  fixing?: boolean
  /** Server id; absent until the batch has been saved to the backend. */
  remoteId?: string
  /** Site the batch belongs to (set when it is started on this phone). */
  siteId?: string | null
  workerName?: string
  /** Reviewer's decision, as sent to the backend (a backend reject-reason key). */
  rejectKey?: string | null
  rejectNote?: string
  /** A supervisor decided on this phone; the decision is sent as a review. */
  reviewing?: boolean
  /** The decision is the admin's final one, not a supervisor's review. */
  adminDecision?: boolean
  /** Carbon credits of the batch (t CO₂e) from the backend, and whether it is still an estimate. */
  credits?: number | null
  creditsEstimated?: boolean
}

/* ------------------------------------------------------------------ */
/* Wizard definitions                                                  */
/* ------------------------------------------------------------------ */

export interface ChoiceOption {
  v: string
  label?: Localized
  sub?: Localized | null
  icon: IconName
}

interface FieldBase {
  k: string
  label: Localized
  /** Not needed to finish the step. */
  optional?: boolean
}

export interface ChoiceFieldDef extends FieldBase {
  type: "choice"
  opts?: ChoiceOption[]
  /** Build options from the backend's lists (site setup, network choices). */
  from?: "source" | "bioref" | "kilns" | "bags" | "to" | "mix" | "vehicles" | "measure" | "sample"
  /** Only shown when another field has this value (e.g. the vehicle when transport is "Vehicle"). */
  when?: { k: string; eq: string }
  /** Setup category the "Add new …" button writes to. */
  addKey?: string
}

export interface NumberFieldDef extends FieldBase {
  type: "number"
  unit?: Localized
  units?: string[]
  /** Key that stores the selected unit when `units` is set. */
  uk?: string
  /** Static hint, or a computed one ("avail" litres / "bags" / "min" from the rules). */
  hint?: Localized | "avail" | "bags" | "min"
  /** Lowest accepted value (from the network's rules). */
  min?: number
}

export interface MediaFieldDef extends FieldBase {
  type: "media"
  kind: "photo" | "video"
  need: number
  tip: Localized
}

export interface MoistureFieldDef extends FieldBase {
  type: "moist"
  tip: Localized
  /** Readings needed (each with a meter photo), from the network's rules. */
  readings: number
}

export interface TimerFieldDef extends FieldBase {
  type: "timer"
}

export interface LocationFieldDef extends FieldBase {
  type: "loc"
}

export type FieldDef =
  | ChoiceFieldDef
  | NumberFieldDef
  | MediaFieldDef
  | MoistureFieldDef
  | TimerFieldDef
  | LocationFieldDef

export interface StepDef {
  title: Localized
  ins: Localized
  /** Illustration placeholder caption. */
  ill: string
  done?: Localized
  fields: FieldDef[]
}

export interface DayDef {
  n: number
  icon: IconName
  name: Localized
  steps: StepDef[]
}

/* ------------------------------------------------------------------ */
/* Site setup, people, credits                                         */
/* ------------------------------------------------------------------ */

export interface SetupItem {
  id: string
  name: string
  sub: string
  /** Asked for and waiting for the admin (a kiln or a bulk density). */
  pending?: boolean
}

export interface SetupList {
  key: string
  items: SetupItem[]
  /** More items on the server than loaded so far. */
  hasMore?: boolean
  page?: number
}

export interface SetupCategoryDef {
  key: string
  icon: IconName
  name: Localized
}

export interface SetupFormFieldDef {
  k: string
  label: Localized
  icon: IconName
  type: "text" | "number" | "tel"
  unit: string
  req: boolean
}

export interface Profile {
  name: string
  phone: string
  village: string
  email: string
}

export interface Supervisor {
  id?: string
  name: string
  ini: string
  role: string
  phone: string
}

export type UploadStatus = "waiting" | "uploading" | "failed"

export interface UploadItem {
  /** Same id as the MediaItem it uploads. */
  id: string
  name: Localized
  status: UploadStatus
  kind: "photo" | "video"
  /** Batch the file belongs to; absent for a profile photo. */
  bid?: string
  /** Classic-app record (waiting to be sent) the file belongs to. */
  rid?: string
  avatar?: boolean
  at: string
}

/** The signed-in account, as the backend knows it. */
export interface Session {
  id: string
  role: Role
  /** Site new batches and list items go to; null until an admin assigns one. */
  siteId: string | null
  /** Must choose their own password (the admin gave a temporary one). */
  mustChangePassword?: boolean
}

/** A change made on the phone that still has to reach the backend. */
export type OutboxOp =
  | { id: string; kind: "setupAdd"; tempId: string; category: string; name: string; detail: string }
  | { id: string; kind: "setupRemove"; category: string; remoteId: string }
  | { id: string; kind: "profile"; data: Profile }
  | { id: string; kind: "avatar"; mediaId: string | null }
  | { id: string; kind: "sell" }

/** A Classic-app record (biomass collection, mixing, packaging, application) made on the phone, not yet sent. */
export interface PendingRecord {
  id: string
  kind: "collections" | "mixings" | "packagings" | "applications"
  /** Site it was made at. */
  siteId: string | null
  /** The form values; photos/videos as MediaItems until they are uploaded. */
  data: Record<string, string | number | MediaItem[] | null | undefined>
  at: string
  /** The backend refused it (the message); kept so the worker can see why. */
  error?: string
}

/** Which layout the app shows: the step-by-step app, or the Classic app existing users know. */
export type UiVariant = "new" | "classic"
