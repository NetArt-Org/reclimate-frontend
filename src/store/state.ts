import type { IconName } from "@/components/common/Icon"
import { createEmptyData, type AppData, type BatchList } from "@/data/app-data"
import type { Dict } from "@/data/i18n"
import type { RecordKind, RegisterOptions } from "@/lib/api/types"
import type { Sync } from "./sync"
import type { Batch, Lang, Localized, MediaItem, OutboxOp, PendingRecord, Profile, Role, UiVariant, UploadItem } from "@/types"

/** Which part of the sign-in flow is shown. */
export type AuthStep = "login" | "forgot" | "setPassword" | "register" | "verifyEmail" | "registerDetails" | "pending" | "rejected"

/* ---- step-by-step app navigation ---- */
export type Tab = "home" | "process" | "credits" | "profile" | "review" | "history"
export type View =
  | "batch" | "wizard" | "uploads" | "setup" | "setupList" | "setupAdd" | "sups" | "editProfile" | "sreview"
  /* Classic app */
  | "settings" | "recordForm" | "sourcePick"
export type SheetKind =
  | "start" | "site" | "sell" | "logout" | "photo" | "reject"
  /* Classic app */
  | "moisture" | "temp" | "endBurn" | "qty" | "language"
  /* both */
  | "deleteAccount"

/* ---- Classic app navigation ---- */
export type ClassicTab = "home" | "biomass" | "production" | "mixing" | "distribution"
/** Sub-tabs: production ongoing|completed, mixing mixing|packaging, distribution application|distribution. */
export type ClassicSub = { production: "ongoing" | "completed"; mixing: "mixing" | "packaging"; distribution: "application" | "distribution"; packing: "only" | "mix"; receivers: "farmer" | "buyer" }

/** A Classic form being filled in: a record to add, or a new kiln process ("start"). */
export interface RecordForm {
  id: string
  kind: RecordKind | "start"
  data: PendingRecord["data"]
}

export interface WizardPos {
  bid: string
  day: number
  step: number
}

export interface CameraState {
  bid?: string
  /** A Classic form (RecordForm.id) the capture goes to. */
  rid?: string
  k?: string
  kind: "photo" | "video"
  need: number
  /** Moisture row index when capturing a meter photo. */
  slot?: number
  label: Localized
  tip: Localized
  avatar?: boolean
  /** Shortest video accepted (seconds), from the network's rules. */
  minSeconds?: number
}

export type CelebrationKind = "d1" | "d2" | "d3" | "batch" | "res"
export interface CelebrationState {
  kind: CelebrationKind
  bid: string
  kg?: number
  bio?: string
  credits?: number
  l?: number
  n?: string | number
}

export interface AddFormState {
  key: string
  vals: Record<string, string>
  /** When opened from the wizard: where to write the new item back. */
  ret: { bid: string; k: string } | null
}

export interface ToastState {
  msg: string
  icon: IconName
  k: number
}

export interface AppState extends AppData {
  /** Saved data has been restored from localStorage (client only). */
  hydrated: boolean
  /** Still checking with the backend whether this phone is signed in. */
  booting: boolean
  lang: Lang
  user: Role | null
  /* sign-in & Register now */
  authStep: AuthStep
  loginEmail: string
  loginPassword: string
  newPassword: string
  newPassword2: string
  loginError: string | null
  loginInfo: string | null
  loginBusy: boolean
  reg: { name: string; phone: string; village: string; role: string; networkId: string; siteId: string; password2: string }
  regOptions: RegisterOptions | null
  regNote: string
  /* step-by-step app */
  tab: Tab
  view: View | null
  sheet: SheetKind | null
  /* Classic app */
  cTab: ClassicTab
  cSub: ClassicSub
  cKiln: string | null
  drawer: boolean
  recordForm: RecordForm | null
  /** Batch a Classic sheet (temperature, end process, quantity, moisture) works on, and its typed values. */
  sheetBatch: string | null
  sheetValues: Record<string, string>
  /* shared */
  online: boolean
  slow: boolean
  loading: boolean
  /** Lists currently fetching their next page. */
  loadingMore: Partial<Record<BatchList | RecordKind | "history" | "supervisors", boolean>>
  now: number
  draft: Profile | null
  addForm: AddFormState | null
  setupIdx: number
  batchId: string | null
  reviewId: string | null
  rejectReason: string | null
  rejectNote: string
  wiz: WizardPos | null
  cam: CameraState | null
  cel: CelebrationState | null
  sellStep: "form" | "done"
  toast: ToastState | null
  savedAt: number
  heroFlash: boolean
}

export interface StoreOptions {
  initialLang?: Lang
}

export function initialState(opts: StoreOptions, ui: UiVariant = "new"): AppState {
  return {
    ...createEmptyData(ui),
    hydrated: false,
    booting: true,
    lang: opts.initialLang ?? "en",
    user: null,
    authStep: "login",
    loginEmail: "",
    loginPassword: "",
    newPassword: "",
    newPassword2: "",
    loginError: null,
    loginInfo: null,
    loginBusy: false,
    reg: { name: "", phone: "", village: "", role: "", networkId: "", siteId: "", password2: "" },
    regOptions: null,
    regNote: "",
    tab: "home",
    view: null,
    sheet: null,
    cTab: "home",
    cSub: { production: "ongoing", mixing: "mixing", distribution: "application", packing: "only", receivers: "farmer" },
    cKiln: null,
    drawer: false,
    recordForm: null,
    sheetBatch: null,
    sheetValues: {},
    online: true,
    slow: false,
    loading: true,
    loadingMore: {},
    now: Date.now(),
    draft: null,
    addForm: null,
    setupIdx: 0,
    batchId: null,
    reviewId: null,
    rejectReason: null,
    rejectNote: "",
    wiz: null,
    cam: null,
    cel: null,
    sellStep: "form",
    toast: null,
    savedAt: 0,
    heroFlash: false,
  }
}

export type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>)

/** What the action modules share: state access, translations, toasts, sync and the batch helpers. */
export interface StoreKit {
  get: () => AppState
  set: (patch: Patch) => void
  t: () => Dict
  toast: (msg: string, icon?: IconName) => void
  later: (fn: () => void, ms: number) => void
  sync: Sync
  find: (id: string | null | undefined) => Batch | undefined
  updateBatch: (bid: string, fn: (b: Batch) => Batch) => void
  setVal: (bid: string, k: string, val: Batch["v"][string]) => void
  queue: (op: OutboxOp) => void
  /** Keep a captured file on the phone, show it straight away and queue it for upload. */
  keepFile: (blob: Blob, upload: Omit<UploadItem, "id" | "status" | "at">) => MediaItem
  /** Refresh from the server (send local changes first). */
  refresh: () => Promise<boolean>
  /** Sign the phone out locally. */
  leave: () => void
}
