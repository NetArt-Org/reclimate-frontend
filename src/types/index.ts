import type { IconName } from "@/components/common/Icon"

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
  remoteId?: number
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
  remoteId?: number
  workerName?: string
  /** Supervisor's decision, as sent to the backend (see REJECT_REASONS). */
  rejectKey?: string | null
  rejectNote?: string
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
}

export interface ChoiceFieldDef extends FieldBase {
  type: "choice"
  opts?: ChoiceOption[]
  /** Build options dynamically from site-setup lists. */
  from?: "source" | "bioref" | "kilns" | "bags" | "to"
  /** Setup category the "Add new …" button writes to. */
  addKey?: string
}

export interface NumberFieldDef extends FieldBase {
  type: "number"
  unit?: Localized
  units?: string[]
  /** Key that stores the selected unit when `units` is set. */
  uk?: string
  /** Static hint, or a computed one ("avail" litres / "bags"). */
  hint?: Localized | "avail" | "bags"
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
}

export interface SetupList {
  key: string
  items: SetupItem[]
}

export interface SetupCategoryDef {
  key: string
  icon: IconName
  name: Localized
  items: string[]
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
  name: string
  ini: string
  role: Localized
  phone: string
}

export interface RejectReason {
  k: string
  en: string
  id: string
  /** Day-2 step the worker is sent back to. */
  step: number
  /** Batch value cleared so it must be captured again. */
  clear: string
}

export interface CreditHistoryEntry {
  icon: IconName
  title: Localized
  date: string
  amt: number
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
  avatar?: boolean
  at: string
}

/** The signed-in account, as the backend knows it. */
export interface Session {
  id: number
  role: Role
  siteId: number | null
}

/** A change made on the phone that still has to reach the backend. */
export type OutboxOp =
  | { id: string; kind: "setupAdd"; tempId: string; category: string; name: string; detail: string }
  | { id: string; kind: "setupRemove"; remoteId: number }
  | { id: string; kind: "profile"; data: Profile }
  | { id: string; kind: "avatar"; mediaId: number | null }
  | { id: string; kind: "sell"; credits: number }
  | { id: string; kind: "lang"; lang: Lang }
