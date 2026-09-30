import type { Lang, Profile } from "@/types"
import { request, requestBlob } from "./client"
import type { ServerBatch, ServerMedia, ServerSetupItem, ServerTransaction, ServerUser } from "./mappers"

export * from "./client"
export * from "./mappers"

interface List<T> {
  docs: T[]
}
interface Saved<T> {
  doc: T
}

const q = (params: Record<string, string | number>) =>
  "?" + Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")

/* ---------- reads ---------- */

export const listBatches = async () =>
  (await request<List<ServerBatch>>("/api/batches" + q({ depth: 1, limit: 200, sort: "-startedAt" }))).docs

export const findBatchByCode = async (code: string) =>
  (await request<List<ServerBatch>>("/api/batches" + q({ depth: 0, limit: 1, "where[code][equals]": code }))).docs[0]

export const listSetupItems = async () =>
  (await request<List<ServerSetupItem>>("/api/setup-items" + q({ depth: 0, limit: 1000, sort: "createdAt" }))).docs

export const listSupervisors = async () =>
  (
    await request<List<ServerUser>>(
      "/api/users" + q({ depth: 0, limit: 50, locale: "all", sort: "name", "where[role][equals]": "supervisor" })
    )
  ).docs

export const listTransactions = async () =>
  (await request<List<ServerTransaction>>("/api/credit-transactions" + q({ depth: 0, limit: 200, locale: "all", sort: "-date" })))
    .docs

export const fetchFile = (url: string) => requestBlob(url)

/* ---------- writes ---------- */

export const createBatch = async (data: object) =>
  (await request<Saved<ServerBatch>>("/api/batches?depth=0", { method: "POST", json: data })).doc

export const updateBatch = async (id: number, data: object) =>
  (await request<Saved<ServerBatch>>(`/api/batches/${id}?depth=0`, { method: "PATCH", json: data })).doc

export async function uploadMedia(file: Blob, meta: { alt: string; capturedAt: string }) {
  const ext = file.type.includes("mp4") ? "mp4" : file.type.startsWith("video") ? "webm" : "jpg"
  const form = new FormData()
  form.append("file", file, `${meta.capturedAt.replace(/[^0-9]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 7)}.${ext}`)
  form.append("_payload", JSON.stringify(meta))
  return (await request<Saved<ServerMedia>>("/api/media?depth=0", { method: "POST", body: form })).doc
}

export const createSetupItem = async (data: { category: string; name: string; detail: string }) =>
  (await request<Saved<ServerSetupItem>>("/api/setup-items?depth=0", { method: "POST", json: data })).doc

export const deleteSetupItem = (id: number) => request(`/api/setup-items/${id}`, { method: "DELETE" })

export const updateProfile = (id: number, p: Profile) =>
  request(`/api/users/${id}?depth=0`, {
    method: "PATCH",
    json: { name: p.name, phone: p.phone, village: p.village, email: p.email || null },
  })

export const updateAvatar = (id: number, mediaId: number | null) =>
  request(`/api/users/${id}?depth=0`, { method: "PATCH", json: { avatar: mediaId } })

export const updateLang = (id: number, lang: Lang) =>
  request(`/api/users/${id}?depth=0`, { method: "PATCH", json: { lang } })

export const createSellRequest = (credits: number) =>
  request("/api/sell-requests?depth=0", { method: "POST", json: { credits } })
