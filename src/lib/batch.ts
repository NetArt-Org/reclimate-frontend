import { BIO } from "@/data/constants"
import type { Batch, FieldDef, Lang, MediaItem, MoistureReading } from "@/types"
import { L } from "./format"

export interface FieldProgress {
  done: boolean
  have?: number
  need?: number
  /** Number field exceeds the biochar available. */
  over?: boolean
  /** A moisture reading is above 15 %. */
  wet?: boolean
}

export const MAX_MOISTURE = 15

export const mediaOf = (b: Batch, k: string) => (b.v[k] as MediaItem[] | undefined) ?? []
export const moistureOf = (b: Batch) => (b.v.moist as MoistureReading[] | undefined) ?? []
export const isWet = (val: string) => parseFloat(val) > MAX_MOISTURE

/** Completion state of a single wizard field for a batch. */
export function fieldProgress(f: FieldDef, b: Batch): FieldProgress {
  const v = b.v
  switch (f.type) {
    case "choice":
      return { done: !!v[f.k] }
    case "number": {
      const n = parseFloat(String(v[f.k] ?? ""))
      const over = f.hint === "avail" && n > b.litres
      return { done: n > 0 && !over, over }
    }
    case "media": {
      const have = mediaOf(b, f.k).length
      return { done: have >= f.need, have, need: f.need }
    }
    case "moist": {
      const r = moistureOf(b)
      const have = [0, 1, 2, 3, 4].filter((i) => r[i] && r[i].val !== "" && r[i].ph).length
      const wet = r.some((x) => x && isWet(x.val))
      return { done: have === 5 && !wet, have, need: 5, wet }
    }
    case "timer":
      return { done: !!v.burn }
    case "loc":
      return { done: !!v.loc }
  }
}

export const bioLabel = (bio: string, lang: Lang) => L(BIO[bio] ?? bio, lang)
