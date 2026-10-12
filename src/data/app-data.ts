import type {
  Bootstrap, FeedstockInfo, Page, RecordKind, RecordMap, SiteStats,
} from "@/lib/api/types"
import type {
  Batch, FieldRules, HistoryEntry, MediaItem, OutboxOp, PendingRecord, Profile, RejectReason, Role, Session, SetupList,
  Supervisor, UiVariant, UploadItem,
} from "@/types"
import { SETUP } from "./constants"

/** Where a paged list stands: the last page loaded and whether the server has more. */
export interface PageState {
  page: number
  hasMore: boolean
  total: number
}

export const pageState = <T,>(p: Page<T> | null | undefined): PageState => ({ page: p?.page ?? 1, hasMore: !!p?.hasMore, total: p?.total ?? 0 })
const noPage = (): PageState => ({ page: 0, hasMore: false, total: 0 })

/** Batch lists that page separately: everything, the review queue, and the Classic production tabs. */
export type BatchList = "all" | "waiting" | "ongoing" | "completed" | "reviewed"

/**
 * Everything the app keeps on the phone: a copy of the signed-in user's data from the backend (the single source
 * of truth), plus the work that has not reached the backend yet. Nothing here is made up on the phone: lists,
 * rules, limits, prices and totals all come from the backend.
 */
export interface AppData {
  batches: Batch[]
  /** Paging of the batch lists (the batches themselves are merged into `batches`). */
  batchPages: Record<BatchList, PageState>
  credits: { earned: number; sold: number; pending: number }
  history: HistoryEntry[]
  historyPage: PageState
  profiles: Record<Role, Profile>
  setup: SetupList[]
  uploads: UploadItem[]
  supervisors: Supervisor[]
  supervisorsPage: PageState
  /** Name of the current site. */
  site: string
  sites: Bootstrap["sites"]
  network: Bootstrap["network"]
  /** The network's wizard rules and limits (null until first loaded). */
  rules: FieldRules | null
  feedstocks: FeedstockInfo[]
  mixingTypes: string[]
  applicationTypes: string[]
  rejectReasons: RejectReason[]
  settings: Bootstrap["settings"] | null
  /** Site totals (biochar, biomass, mixing, packing, 30-day trend). */
  stats: SiteStats | null
  /** Classic-app record lists. */
  records: { [K in RecordKind]: RecordMap[K][] }
  recordPages: Record<RecordKind, PageState>
  /** Classic-app records made on the phone and not yet sent. */
  pendingRecords: PendingRecord[]
  avatarItem: MediaItem | null
  /** Signed-in account, or null on the login screen. */
  me: Session | null
  /** Account this cached data belongs to — it is wiped if someone else signs in. */
  ownerId: string | null
  /** Ids of batches changed on the phone and not yet saved to the backend. */
  dirty: string[]
  outbox: OutboxOp[]
  /** Which layout this phone shows (chosen on the login screen: existing users get the Classic app). */
  ui: UiVariant
}

const blankProfile = (): Profile => ({ name: "", phone: "", village: "", email: "" })

export const createEmptyData = (ui: UiVariant = "new"): AppData => ({
  batches: [],
  batchPages: { all: noPage(), waiting: noPage(), ongoing: noPage(), completed: noPage(), reviewed: noPage() },
  credits: { earned: 0, sold: 0, pending: 0 },
  history: [],
  historyPage: noPage(),
  profiles: { worker: blankProfile(), sup: blankProfile() },
  setup: SETUP.map((c) => ({ key: c.key, items: [] })),
  uploads: [],
  supervisors: [],
  supervisorsPage: noPage(),
  site: "",
  sites: [],
  network: null,
  rules: null,
  feedstocks: [],
  mixingTypes: [],
  applicationTypes: [],
  rejectReasons: [],
  settings: null,
  stats: null,
  records: { collections: [], mixings: [], packagings: [], applications: [] },
  recordPages: { collections: noPage(), mixings: noPage(), packagings: noPage(), applications: noPage() },
  pendingRecords: [],
  avatarItem: null,
  me: null,
  ownerId: null,
  dirty: [],
  outbox: [],
  ui,
})
