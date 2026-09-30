import { Capacitor } from "@capacitor/core"

/**
 * HTTP client for the Payload backend.
 *
 * How the session is kept — and why it differs per platform:
 *  - Browser: the backend sets an HttpOnly cookie. JavaScript can never read
 *    it, so a script injected into the page cannot steal the session. The
 *    token that also comes back in the login response is thrown away.
 *  - Android / iOS app: the webview's origin is unrelated to the backend's, so
 *    cookies are not reliable. The token is kept in the device Keystore /
 *    Keychain (never in localStorage) and sent as an Authorization header.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "")

const TOKEN_KEY = "session-token"
/** Set when the user logged out while offline, so the cookie could not be cleared yet. */
const LOGOUT_PENDING_KEY = "reclimate-logout-pending"

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

/** The server could not be reached at all (offline, server down, blocked). */
export class NetworkError extends Error {}

/** 401/403 can mean "session gone" as well as "not allowed" — the caller checks which. */
export const isAuthError = (e: unknown) => e instanceof ApiError && (e.status === 401 || e.status === 403)

const isNative = () => Capacitor.isNativePlatform()

let token: string | null = null
let tokenLoaded = false

const secureStorage = async () => (await import("@aparajita/capacitor-secure-storage")).SecureStorage

async function loadToken() {
  if (tokenLoaded || !isNative()) return
  tokenLoaded = true
  try {
    token = await (await secureStorage()).getItem(TOKEN_KEY)
  } catch {
    token = null
  }
}

async function saveToken(value: string | null) {
  if (!isNative()) return
  token = value
  tokenLoaded = true
  try {
    const store = await secureStorage()
    if (value) await store.setItem(TOKEN_KEY, value)
    else await store.removeItem(TOKEN_KEY)
  } catch {
    /* secure storage unavailable — the session lasts until the app is closed */
  }
}

const flag = {
  get: () => {
    try {
      return localStorage.getItem(LOGOUT_PENDING_KEY) === "1"
    } catch {
      return false
    }
  },
  set: (on: boolean) => {
    try {
      if (on) localStorage.setItem(LOGOUT_PENDING_KEY, "1")
      else localStorage.removeItem(LOGOUT_PENDING_KEY)
    } catch {
      /* ignore */
    }
  },
}

type Init = Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit }

async function send(path: string, init: Init = {}): Promise<Response> {
  await loadToken()
  const headers = new Headers(init.headers)
  let body = init.body
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json")
    body = JSON.stringify(init.json)
  }
  if (token) headers.set("Authorization", `JWT ${token}`)
  let res: Response
  try {
    res = await fetch(API_URL + path, { ...init, body, headers, credentials: isNative() ? "omit" : "include" })
  } catch {
    throw new NetworkError()
  }
  if (!res.ok) {
    let message = res.statusText
    try {
      const data = await res.json()
      message = data?.errors?.[0]?.message ?? data?.message ?? message
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, message)
  }
  return res
}

export async function request<T>(path: string, init?: Init): Promise<T> {
  const res = await send(path, init)
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

export async function requestBlob(path: string): Promise<Blob> {
  return (await send(path)).blob()
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export const phoneToUsername = (phone: string) => phone.replace(/\D/g, "")

export async function login<U>(phone: string, pin: string): Promise<U> {
  const data = await request<{ user: U; token?: string }>("/api/users/login?depth=1", {
    method: "POST",
    json: { username: phoneToUsername(phone), password: pin },
  })
  flag.set(false)
  await saveToken(data.token ?? null)
  return data.user
}

/** The signed-in user, or null when there is no valid session. Throws NetworkError when offline. */
export async function me<U>(): Promise<U | null> {
  if (flag.get()) {
    await logout()
    return null
  }
  const data = await request<{ user: U | null }>("/api/users/me?depth=1")
  if (!data.user) await saveToken(null)
  return data.user
}

export async function logout() {
  try {
    await request("/api/users/logout", { method: "POST" })
    flag.set(false)
  } catch (e) {
    // Offline: the browser cookie cannot be cleared yet. Remember to do it
    // before the next session starts, so logging out always sticks.
    flag.set(e instanceof NetworkError && !isNative())
  }
  await saveToken(null)
}
