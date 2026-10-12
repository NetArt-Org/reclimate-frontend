import { Capacitor } from "@capacitor/core"

/**
 * Phone features, the same way on Android/iOS (Capacitor plugins, with proper permission prompts) and in a browser
 * (web APIs). Screens never call these directly; the store does.
 */
export const isNative = () => Capacitor.isNativePlatform()

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"

let model: string | null = null
/** "Samsung SM-A125F", "iPhone14,5" or the browser, reported to the backend with the app version. */
export async function deviceModel(): Promise<string> {
  if (model) return model
  try {
    if (isNative()) {
      const { Device } = await import("@capacitor/device")
      const info = await Device.getInfo()
      model = [info.manufacturer, info.model].filter(Boolean).join(" ") || info.platform
    } else {
      model = `Browser · ${navigator.platform || "web"}`
    }
  } catch {
    model = "Unknown device"
  }
  return model
}

export interface Position {
  lat: number
  lng: number
}

/** Current GPS position. Asks for permission the first time; rejects when it is refused or unavailable. */
export async function currentPosition(): Promise<Position> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation")
    const perm = await Geolocation.checkPermissions()
    if (perm.location !== "granted") {
      const asked = await Geolocation.requestPermissions({ permissions: ["location"] })
      if (asked.location !== "granted") throw new Error("permission")
    }
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 })
    return { lat: p.coords.latitude, lng: p.coords.longitude }
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unavailable"))
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 15000 }
    )
  })
}

/** Open the phone's dialer. Capacitor hands `tel:` links to the system on Android and iOS. */
export function callPhone(phone: string) {
  const number = phone.replace(/[^\d+]/g, "")
  if (!number) return false
  window.location.href = `tel:${number}`
  return true
}

/**
 * Android's back button: `handler` returns true when it handled the press (closed a sheet, went back a screen);
 * otherwise the app goes to the background, as Android users expect. Returns a cleanup function.
 */
export function onBackButton(handler: () => boolean): () => void {
  if (!isNative()) return () => {}
  let remove: (() => void) | null = null
  let cancelled = false
  void import("@capacitor/app").then(({ App }) =>
    App.addListener("backButton", () => {
      if (!handler()) void App.minimizeApp()
    }).then((l) => {
      if (cancelled) void l.remove()
      else remove = () => void l.remove()
    })
  )
  return () => {
    cancelled = true
    remove?.()
  }
}

/** The app came back to the foreground (refresh what changed while it was away). */
export function onResume(handler: () => void): () => void {
  if (!isNative()) return () => {}
  let remove: (() => void) | null = null
  let cancelled = false
  void import("@capacitor/app").then(({ App }) =>
    App.addListener("resume", handler).then((l) => {
      if (cancelled) void l.remove()
      else remove = () => void l.remove()
    })
  )
  return () => {
    cancelled = true
    remove?.()
  }
}

/** Length of a recorded/picked video in seconds (null when it cannot be read). */
export function videoSeconds(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const v = document.createElement("video")
    const done = (s: number | null) => {
      URL.revokeObjectURL(url)
      resolve(s)
    }
    v.preload = "metadata"
    v.onloadedmetadata = () => {
      // Some recorders report Infinity until the file is scanned; seek to the end to get the real length.
      if (v.duration === Infinity) {
        v.currentTime = 1e9
        v.ontimeupdate = () => done(Number.isFinite(v.duration) ? v.duration : null)
      } else done(Number.isFinite(v.duration) ? v.duration : null)
    }
    v.onerror = () => done(null)
    v.src = url
  })
}
