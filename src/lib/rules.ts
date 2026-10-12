import { DAYS } from "@/data/constants"
import type { DayDef, FieldDef, FieldRules, Localized, MediaFieldDef, MoistureFieldDef, NumberFieldDef, StepDef } from "@/types"
import { limits } from "./batch"

/**
 * The admin sets the field rules per network (backend → Settings → Field app settings): photo and video counts,
 * video length, moisture readings and limit, temperature readings and minimum, which quench photos, whether
 * mixing is used, and whether open biochar may be applied. They are applied to the wizard here — after sign-in
 * and whenever they change. `DAYS` is rebuilt from the untouched template, so applying `null` (signed out)
 * resets it.
 */
const TEMPLATE: DayDef[] = structuredClone(DAYS)

/** The admin's quench photo names → the wizard's fields. */
const QUENCH: Record<string, string> = { "Pre-quench": "preq", Quenching: "quench", "Post-quench": "postq", Drying: "dry" }

const fill = (l: Localized, values: Record<string, string | number>): Localized => {
  const f = (s: string) => s.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""))
  return typeof l === "string" ? f(l) : { en: f(l.en), id: f(l.id) }
}

function build(rules: FieldRules): DayDef[] {
  const days = structuredClone(TEMPLATE)
  const need: Record<string, number> = {
    bphoto: rules.photos.biomass,
    firePh: rules.minFiringImages,
    fireVid: rules.recordVideo ? rules.minFiringVideos : 0,
    mixPh: rules.photos.mixing,
    packPh: rules.photos.packing,
    applyPh: rules.photos.application,
  }
  const quench = new Set(rules.quenchSteps.map((q) => QUENCH[q]).filter(Boolean))

  for (const day of days) {
    day.steps = day.steps
      .map((st): StepDef => {
        const fields = st.fields.flatMap((f): FieldDef[] => {
          if (f.type === "media" && f.k in need) {
            if (need[f.k] <= 0) return []
            const m: MediaFieldDef = { ...f, need: need[f.k] }
            if (f.k === "fireVid") m.tip = fill(f.tip, { s: rules.minVideoSeconds })
            return [m]
          }
          if (f.type === "media" && f.k in Object.fromEntries(Object.values(QUENCH).map((k) => [k, 1]))) return quench.has(f.k) ? [f] : []
          if (f.type === "moist") return rules.moisture.required ? [{ ...f, readings: Math.max(1, rules.moisture.readings) } as MoistureFieldDef] : []
          if (f.k === "temp" && f.type === "number") {
            if (!rules.temperature.required) return []
            const n = Math.max(1, rules.temperature.readings)
            return Array.from({ length: n }, (_, i): NumberFieldDef => ({
              ...f,
              k: i === 0 ? "temp" : `temp${i + 1}`,
              label: n > 1 ? fill({ en: "Temperature {i}", id: "Suhu {i}" }, { i: i + 1 }) : f.label,
              min: rules.temperature.min || undefined,
            }))
          }
          return [f]
        })
        const ins = st.fields.some((f) => f.type === "moist") ? fill(st.ins, { n: rules.moisture.readings }) : st.ins
        return { ...st, ins, fields }
      })
      // A step with nothing left to capture is skipped (e.g. moisture not required, mixing switched off).
      .filter((st) => st.fields.length > 0)
    if (day.n === 3 && rules.hideMixingTab) day.steps = day.steps.filter((st) => !st.fields.some((f) => f.k === "mixType" || f.k === "mixL" || f.k === "mixPh"))
  }
  return days
}

export function applyRules(rules: FieldRules | null) {
  limits.moisture = rules ? rules.moisture.max || Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY
  limits.minVideoSeconds = rules?.recordVideo ? rules.minVideoSeconds : 0
  limits.canApplyOpen = !!rules?.canApplyOpenBiochar
  DAYS.splice(0, DAYS.length, ...(rules ? build(rules) : structuredClone(TEMPLATE)))
}

/** Where to send a worker to redo `slot` after a rejection: the Day 2 step that captures it. */
export function stepFor(slot: string): number | undefined {
  const i = DAYS[1].steps.findIndex((st) => st.fields.some((f) => f.k === slot || (slot === "temp" && /^temp\d*$/.test(f.k))))
  return i >= 0 ? i : undefined
}
