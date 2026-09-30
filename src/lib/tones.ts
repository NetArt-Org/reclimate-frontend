/** Semantic colour tones shared by tiles, banners and badges. */
export type Tone = "brand" | "clay" | "success" | "warn" | "danger" | "info" | "teal" | "neutral" | "dark" | "solid"

export const toneSoft: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  clay: "bg-clay-soft text-clay",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  teal: "bg-teal-soft text-teal-ink",
  neutral: "bg-track text-ink-subtle",
  dark: "bg-ink text-white",
  solid: "bg-brand text-white",
}

/** Banner variants use the darker "ink" text colour for readability. */
export const toneBanner: Record<Exclude<Tone, "dark" | "solid" | "neutral" | "clay">, string> = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success-ink",
  warn: "bg-warn-soft text-warn-ink",
  danger: "bg-danger-soft text-danger-ink",
  info: "bg-info-soft text-info-ink",
  teal: "bg-teal-soft text-teal-ink",
}
