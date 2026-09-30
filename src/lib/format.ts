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

export const formatRupiahMillions = (rupiah: number, lang: Lang) =>
  `Rp ${formatNumber(rupiah / 1e6, lang, 1)} ${lang === "id" ? "juta" : "million"}`

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
