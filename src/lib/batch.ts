import type { Batch, FieldDef, MediaItem, MoistureReading } from "@/types"

export interface FieldProgress {
  done: boolean
  have?: number
  need?: number
  /** Number field exceeds the biochar available. */
  over?: boolean
  /** Number field is below the network's minimum (e.g. temperature). */
  low?: boolean
  /** A moisture reading is above the network's limit. */
  wet?: boolean
}

/**
 * The network's limits, set from the backend's rules after sign-in (see lib/rules). Until the rules are loaded no
 * limit is enforced — nothing is checked against a made-up number.
 */
export const limits = {
  /** Highest moisture reading (%) accepted. */
  moisture: Number.POSITIVE_INFINITY,
  /** Shortest firing video (seconds). */
  minVideoSeconds: 0,
  /** Open (unmixed) biochar may be packed/applied without a bag. */
  canApplyOpen: false,
}

export const mediaOf = (b: Batch, k: string) => (b.v[k] as MediaItem[] | undefined) ?? []
export const moistureOf = (b: Batch) => (b.v.moist as MoistureReading[] | undefined) ?? []
export const isWet = (val: string) => parseFloat(val) > limits.moisture

/** A field is shown only when its condition holds (e.g. the vehicle when transport is "Vehicle"). */
export const fieldShown = (f: FieldDef, b: Batch) => !("when" in f && f.when) || String(b.v[f.when.k] ?? "") === f.when.eq

/** Completion state of a single wizard field for a batch. */
export function fieldProgress(f: FieldDef, b: Batch): FieldProgress {
  const v = b.v
  if (!fieldShown(f, b)) return { done: true }
  const p = progress(f, b, v)
  return f.optional && !p.done && !p.over && !p.low && !p.wet ? { ...p, done: true } : p
}

function progress(f: FieldDef, b: Batch, v: Batch["v"]): FieldProgress {
  switch (f.type) {
    case "choice":
      return { done: !!v[f.k] }
    case "number": {
      const n = parseFloat(String(v[f.k] ?? ""))
      const over = f.hint === "avail" && n > b.litres
      const low = f.min != null && Number.isFinite(n) && n < f.min
      return { done: n > 0 && !over && !low, over, low }
    }
    case "media": {
      const have = mediaOf(b, f.k).length
      return { done: have >= f.need, have, need: f.need }
    }
    case "moist": {
      const r = moistureOf(b)
      const need = f.readings
      const have = Array.from({ length: need }, (_, i) => i).filter((i) => r[i] && r[i].val !== "" && r[i].ph).length
      const wet = r.some((x) => x && isWet(x.val))
      return { done: have === need && !wet, have, need, wet }
    }
    case "timer":
      return { done: !!v.burn }
    case "loc":
      return { done: !!v.loc }
  }
}
