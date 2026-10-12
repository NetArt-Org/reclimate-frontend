import type { MediaItem, Profile, SetupItem } from "@/types"
import { request, requestBlob, requestFresh } from "./client"
import type {
  Bootstrap, HistoryEntry, Page, RecordKind, RecordMap, RegisterOptions, RegisterStatusReply, ServerBatch, SiteStats, Supervisor,
} from "./types"

/**
 * Every call the app makes to the backend, in one place. The backend is the single source of truth: screens show
 * what these return, and every change goes through them.
 */
export * from "./client"
export * from "./mappers"
export * from "./types"

/* ---------- start-up, pages, summary ---------- */

/** Everything the app needs after sign-in, for the current site. */
export const bootstrap = () => request<Bootstrap>("/me")
/** The same, but `null` when nothing changed since the copy with this ETag (polling sends almost nothing). */
export const bootstrapIfChanged = (etag: string | null) => requestFresh<Bootstrap>("/me", etag)

export const stats = () => request<SiteStats>("/stats")

export type BatchFilter = "waiting" | "ongoing" | "completed" | "reviewed"
export const batchPage = (page: number, filter?: BatchFilter) => request<Page<ServerBatch>>("/page/batches", { query: { page, filter } })
export const historyPage = (page: number) => request<Page<HistoryEntry>>("/page/history", { query: { page } })
export const supervisorPage = (page: number) => request<Page<Supervisor>>("/page/supervisors", { query: { page } })
export const setupPage = (key: string, page: number) => request<Page<SetupItem>>(`/page/setup/${encodeURIComponent(key)}`, { query: { page } })
export const recordPage = <K extends RecordKind>(kind: K, page: number, filter?: string) =>
  request<Page<RecordMap[K]>>(`/page/${kind}`, { query: { page, filter } })

export const fetchFile = (url: string) => requestBlob(url)

/* ---------- batches ---------- */

export const saveBatch = async (code: string, data: object) =>
  (await request<{ batch: ServerBatch }>(`/batches/${encodeURIComponent(code)}`, { method: "PUT", json: data, idempotent: true })).batch

export const reviewBatch = async (code: string, data: object) =>
  (await request<{ batch: ServerBatch }>(`/batches/${encodeURIComponent(code)}/review`, { method: "POST", json: data })).batch

/* ---------- records (Classic app) ---------- */

/** `clientId` (the phone's id for the record) makes it safe to send again. */
export const createRecord = (kind: RecordKind, data: Record<string, unknown> & { clientId: string }) =>
  request<{ ok: true; id: string }>(`/${kind}`, { method: "POST", json: data, idempotent: true })

/* ---------- files ---------- */

/** Upload a photo/video. `clientId` (its id on the phone) makes a repeated upload return the stored file. */
export async function uploadMedia(file: Blob, capturedAt: string, clientId: string) {
  const ext = file.type.includes("mp4") ? "mp4" : file.type.includes("quicktime") ? "mov" : file.type.startsWith("video") ? "webm" : "jpg"
  const form = new FormData()
  form.append("file", file, `${capturedAt.replace(/[^0-9]/g, "").slice(0, 14)}-${clientId}.${ext}`)
  form.append("clientId", clientId)
  return (await request<{ file: MediaItem }>("/files", { method: "POST", body: form, idempotent: true })).file
}

/* ---------- site setup ---------- */

/** `clientId` (the item's id on the phone) makes it safe to send again after a lost reply. */
export const createSetupItem = async (category: string, data: { name: string; sub: string; clientId: string }) =>
  (await request<{ item: SetupItem }>(`/setup/${encodeURIComponent(category)}`, { method: "POST", json: data, idempotent: true })).item

export const deleteSetupItem = (category: string, id: string) =>
  request(`/setup/${encodeURIComponent(category)}/${encodeURIComponent(id)}`, { method: "DELETE" })

/* ---------- profile & account ---------- */

/** Name, phone and village. The email is the login, so only an admin changes it. */
export const updateProfile = (p: Profile) =>
  request("/profile", { method: "PATCH", json: { name: p.name, phone: p.phone, village: p.village } })

export const updateAvatar = (mediaId: string | null) => request("/profile", { method: "PATCH", json: { photoId: mediaId } })

export const passwordChanged = () => request("/password-changed", { method: "POST", json: {}, idempotent: true })

/** Delete the account (sign-in and personal details erased; records stay without them). */
export const deleteAccount = () => request("/account/delete", { method: "POST", json: {} })

/** Ask to sell every unsold credit; the backend works out the amount. */
export const createSellRequest = () => request("/sell-requests", { method: "POST", json: {} })

/* ---------- Register now ---------- */

export const registerOptions = () => request<RegisterOptions>("/register/options")
export const registerStatus = () => request<RegisterStatusReply>("/register/status")
export const register = (data: { name: string; phone: string; village: string; role: string; siteId: string }) =>
  request<{ ok: true; status: string }>("/register", { method: "POST", json: data })
