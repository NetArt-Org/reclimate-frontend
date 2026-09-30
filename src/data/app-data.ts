import type {
  Batch, CreditHistoryEntry, MediaItem, OutboxOp, Profile, Role, Session, SetupList, Supervisor, UploadItem,
} from "@/types"
import { SETUP } from "./constants"

/**
 * Everything the app keeps on the phone: a copy of the signed-in user's data
 * from the backend, plus the work that has not reached the backend yet.
 */
export interface AppData {
  batches: Batch[]
  credits: { earned: number; sold: number }
  history: CreditHistoryEntry[]
  profiles: Record<Role, Profile>
  setup: SetupList[]
  uploads: UploadItem[]
  supervisors: Supervisor[]
  site: string
  avatarItem: MediaItem | null
  /** Signed-in account, or null on the login screen. */
  me: Session | null
  /** Account this cached data belongs to — it is wiped if someone else signs in. */
  ownerId: number | null
  /** Ids of batches changed on the phone and not yet saved to the backend. */
  dirty: string[]
  outbox: OutboxOp[]
}

const blankProfile = (): Profile => ({ name: "", phone: "", village: "", email: "" })

export const createEmptyData = (): AppData => ({
  batches: [],
  credits: { earned: 0, sold: 0 },
  history: [],
  profiles: { worker: blankProfile(), sup: blankProfile() },
  setup: SETUP.map((c) => ({ key: c.key, items: [] })),
  uploads: [],
  supervisors: [],
  site: "",
  avatarItem: null,
  me: null,
  ownerId: null,
  dirty: [],
  outbox: [],
})
