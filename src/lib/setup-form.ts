import type { Dict } from "@/data/i18n"
import { SETUP_FORMS } from "@/data/constants"
import { L, fill } from "@/lib/format"
import { SHAPES } from "@/lib/shape-volume"
import type { Lang, MediaItem } from "@/types"

/**
 * What an "Add new" form still needs before it can be saved, or null when it is complete: the name, every required
 * choice, the shape and all its measurements, the photo, the location. The Save button stays grey until this is null,
 * and the same check guards the save itself.
 */
export function addFormMissing(form: { key: string; vals: Record<string, string>; media: MediaItem[] }, t: Dict, lang: Lang): string | null {
  const val = (k: string) => String(form.vals[k] ?? "").trim()
  for (const [i, f] of SETUP_FORMS[form.key].entries()) {
    if (i > 0 && !f.req) continue
    if (f.type === "shape") {
      const shape = val("shape")
      if (!shape) return t.pickShape
      const keys = SHAPES[f.shapeKind ?? "kiln"][shape] ?? []
      if (keys.some((d) => !(Number(val(`dim:${d}`).replace(",", ".")) > 0))) return t.dimsNeeded
    } else if (f.type === "photo") {
      if (!form.media.length) return t.photoNeeded
    } else if (f.type === "location") {
      if (!val("lat")) return val("locState") === "failed" ? t.locNeeded : t.locGetting
    } else if (f.type === "number") {
      if (!(Number(val(f.k).replace(",", ".")) > 0)) return fill(t.fieldNeeded, { f: L(f.label, lang).toLowerCase() })
    } else if (!val(f.k)) return fill(t.fieldNeeded, { f: L(f.label, lang).toLowerCase() })
  }
  return null
}
