import { firebaseSignOut, idToken } from "@/lib/firebase"
import { APP_VERSION, deviceModel } from "@/lib/native"
import type { AccessCode } from "./types"

/**
 * HTTP client for the backend's field-app API (/api/field/...).
 *
 * The session is the Firebase sign-in: every request carries a short-lived Firebase ID token in
 * `X-Field-Token` (not `Authorization`: Firebase App Hosting's edge acts on a Firebase token there and answers
 * 500 before the request reaches the backend). Nothing is kept in cookies or localStorage by this module, and the backend
 * checks on every request that the person still has app access. Each request also names the site the app
 * works on (`?site=`) and reports the app version and phone model.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "")

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: AccessCode
  ) {
    super(message)
  }
}

/** The server could not be reached at all (offline, server down, blocked). */
export class NetworkError extends Error {}

/** No signed-in Firebase user on this device. */
export class SignedOutError extends Error {}

/** 401: the sign-in is no longer accepted. 403: this account has no (or no longer) app access. */
export const isAuthError = (e: unknown) =>
  e instanceof SignedOutError || (e instanceof ApiError && (e.status === 401 || e.status === 403))

/** The account cannot open the app yet for a reason the app shows its own screen for (sign-up, approval…). */
export const accessCode = (e: unknown): AccessCode | null =>
  e instanceof ApiError && (e.status === 401 || e.status === 403) ? (e.code ?? (e.status === 401 ? "signed_out" : "access_off")) : null

/**
 * The backend no longer serves this app version (426 `update_required`). Once seen, it stays set until the app is
 * updated; the main page shows a blocking "Update the app" screen.
 */
let updateNeeded = false
const updateListeners = new Set<() => void>()
export const isUpdateRequired = () => updateNeeded
export const onUpdateRequired = (cb: () => void) => {
  updateListeners.add(cb)
  return () => void updateListeners.delete(cb)
}
export function markUpdateRequired() {
  if (updateNeeded) return
  updateNeeded = true
  updateListeners.forEach((cb) => cb())
}

/** The site the app works on; sent with every request. */
let currentSite: string | null = null
export const setSite = (id: string | null) => {
  currentSite = id
}
let offline = false
export const setOfflineMode = (on: boolean) => {
  offline = on
}

type Init = Omit<RequestInit, "body"> & {
  json?: unknown
  body?: BodyInit
  query?: Record<string, string | number | undefined>
  /**
   * Safe to send again if the reply was lost (reads, saves by id, records carrying their own id). Only these are
   * retried after a network failure; any request is retried when the server says it did not run it (429/503).
   */
  idempotent?: boolean
  /** Send If-None-Match with this ETag; a 304 reply comes back as `null`. */
  etag?: string
}

/** How many times a request is tried, and the longest wait between tries (backoff with jitter). */
const MAX_TRIES = 3
const MAX_WAIT_MS = 30_000
const wait = (ms: number) => new Promise((ok) => setTimeout(ok, ms))
const backoff = (n: number, retryAfter?: string | null) => {
  const server = Number(retryAfter)
  if (Number.isFinite(server) && server > 0) return Math.min(MAX_WAIT_MS, server * 1000)
  return Math.min(MAX_WAIT_MS, 600 * 2 ** n + Math.random() * 400)
}

function urlFor(path: string, query?: Init["query"]) {
  const params = new URLSearchParams()
  if (currentSite) params.set("site", currentSite)
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== "") params.set(k, String(v))
  const qs = params.toString()
  return `${API_URL}/api/field${path}${qs ? (path.includes("?") ? "&" : "?") + qs : ""}`
}

async function attempt(path: string, init: Init, force: boolean): Promise<Response> {
  const token = await idToken(force).catch(() => {
    throw new NetworkError()
  })
  if (!token) throw new SignedOutError()
  const headers = new Headers(init.headers)
  let body = init.body
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json")
    body = JSON.stringify(init.json)
  }
  headers.set("X-Field-Token", token)
  headers.set("X-App-Version", APP_VERSION)
  headers.set("X-Device-Model", await deviceModel())
  headers.set("X-App-Mode", offline ? "offline" : "online")
  if (init.etag) headers.set("If-None-Match", init.etag)
  const { query, json, idempotent, etag, ...rest } = init
  void json // sent as `body` above
  void idempotent
  void etag
  try {
    return await fetch(urlFor(path, query), { ...rest, body, headers, credentials: "omit" })
  } catch {
    throw new NetworkError()
  }
}

async function send(path: string, init: Init = {}): Promise<Response> {
  const safe = init.idempotent ?? (!init.method || init.method === "GET")
  let res: Response | null = null
  for (let n = 0; n < MAX_TRIES; n++) {
    try {
      res = await attempt(path, init, false)
      // A token can expire between being read and arriving; try once more with a fresh one.
      if (res.status === 401) res = await attempt(path, init, true)
    } catch (e) {
      // No reply at all: only requests that are safe to repeat are tried again.
      if (e instanceof NetworkError && safe && n < MAX_TRIES - 1) {
        await wait(backoff(n))
        continue
      }
      throw e
    }
    // The server did not run it (busy, rate limited, or a gateway hiccup on a read): wait and try again.
    const again = res.status === 429 || res.status === 503 || (safe && (res.status === 502 || res.status === 504))
    if (again && n < MAX_TRIES - 1) {
      await wait(backoff(n, res.headers.get("Retry-After")))
      continue
    }
    break
  }
  if (!res) throw new NetworkError()
  if (res.status === 304) return res
  if (!res.ok) {
    let message = res.statusText
    let code: AccessCode | undefined
    try {
      const data = await res.json()
      message = data?.error ?? message
      code = data?.code ?? undefined
    } catch {
      /* not JSON */
    }
    if (res.status === 426 || code === "update_required") markUpdateRequired()
    throw new ApiError(res.status, message, code)
  }
  return res
}

export async function request<T>(path: string, init?: Init): Promise<T> {
  const res = await send(path, init)
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

/** A GET that may come back unchanged: `null` when the server's copy matches `etag`. */
export async function requestFresh<T>(path: string, etag: string | null): Promise<{ data: T; etag: string | null } | null> {
  const res = await send(path, { etag: etag ?? undefined })
  if (res.status === 304) return null
  return { data: (await res.json()) as T, etag: res.headers.get("ETag") }
}

/** A message for the person, from any error (the backend's own wording when it sent one). */
export function errorMessage(e: unknown, fallback: string, offline: string): string {
  if (e instanceof NetworkError) return offline
  if (e instanceof ApiError && e.message && e.status < 500) return e.message
  return fallback
}

/** A photo/video. `url` is the path the backend gave (/api/field/files/<id>). */
export async function requestBlob(url: string): Promise<Blob> {
  const path = url.startsWith("/api/field") ? url.slice("/api/field".length) : url
  return (await send(path)).blob()
}

export async function logout() {
  await firebaseSignOut().catch(() => {})
}
