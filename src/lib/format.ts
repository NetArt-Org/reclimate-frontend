import type { Lang, Localized } from "@/types"

/** Resolve a localized value for the active language. */
export const L = (o: Localized | null | undefined, lang: Lang): string =>
  o == null ? "" : typeof o === "object" ? (o[lang] ?? o.en) : String(o)

/** Replace `{key}` placeholders. */
export const fill = (s: string, values: Record<string, string | number>) =>
  Object.keys(values).reduce((acc, k) => acc.split(`{${k}}`).join(String(values[k])), s)

/** Locale-aware number format (id-ID uses `.` thousands, `,` decimals). */
export const formatNumber = (n: number, lang: Lang, digits = 0) =>
  Number(n).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })

/** Money in the currency the admin set (large amounts shortened: "Rp 1,2 jt", "IDR 1.2M"). */
export const formatMoney = (amount: number, currency: string, lang: Lang) => {
  try {
    return new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: currency || "IDR",
      notation: Math.abs(amount) >= 1e6 ? "compact" : "standard",
      maximumFractionDigits: Math.abs(amount) >= 1e6 ? 1 : 0,
    }).format(amount)
  } catch {
    return `${currency} ${formatNumber(amount, lang)}`
  }
}

/** ISO date → "23/09/2026". */
export const formatDay = (iso: string | null | undefined) => {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** ISO date → "03:19 PM". */
export const formatTime = (iso: string | number | null | undefined) => {
  if (iso == null || iso === "") return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

/** Litres → m³ with 3 decimals, as the Classic app shows volumes. */
export const m3 = (litres: number, lang: Lang) => formatNumber(litres / 1000, lang, 3)

const pad2 = (n: number) => String(n).padStart(2, "0")

const pad = (n: number) => String(n).padStart(2, "0")

/** hh:mm:ss between two timestamps (defaults `to` to now). */
export const formatElapsed = (from: number | undefined, to: number) => {
  if (!from) return "00:00:00"
  const s = Math.max(0, Math.floor((to - from) / 1000))
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`
}

export const formatClock = (ts: number) => {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "Pak Andi Saputra" → { short: "Pak Andi", initials: "AS" } (honorifics skipped). */
export const nameParts = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const core = words.filter((w) => !["pak", "ibu", "bapak", "bu"].includes(w.toLowerCase()))
  return {
    short: words.slice(0, 2).join(" "),
    initials: (core.slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase(),
  }
}
