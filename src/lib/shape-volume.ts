/**
 * Kiln and container shapes the app measures, and their volume — the same code as the backend's
 * src/lib/shape-volume.ts (keep them in step). Dimensions are sent in millimetres with the keys the backend stores;
 * the app shows centimetres. The volume here is a preview: the backend works it out again and stores its own.
 */

export type ShapeKind = 'kiln' | 'container'

export const SHAPES: Record<ShapeKind, Record<string, string[]>> = {
  // Kilns are measured by their depth.
  kiln: {
    conical: ['upperSurfaceDiameter', 'lowerSurfaceDiameter', 'depth'],
    cylinder: ['diameter', 'depth'],
    rectangular: ['length', 'width', 'depth'],
    squarePyramid: ['upperSide', 'lowerSide', 'depth'],
  },
  // Containers by their height.
  container: {
    conical: ['upperSurfaceDiameter', 'lowerSurfaceDiameter', 'height'],
    cylinder: ['diameter', 'height'],
    cuboid: ['length', 'width', 'height'],
  },
}

export const isShape = (kind: ShapeKind, shape: unknown): shape is string => typeof shape === 'string' && Object.hasOwn(SHAPES[kind], shape)

/** Volume in litres from dimensions in millimetres; null when a dimension is missing or not positive. */
export function volumeLitresMm(kind: ShapeKind, shape: string, mm: Record<string, unknown>): number | null {
  const keys = SHAPES[kind][shape]
  if (!keys) return null
  const v = keys.map((k) => mm[k])
  if (!v.every((x): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0)) return null
  // mm³ → litres: ÷ 1,000,000
  const L = (mm3: number) => mm3 / 1_000_000
  switch (shape) {
    case 'conical': {
      const [D, d, h] = v
      return L(((Math.PI * h) / 12) * (D * D + D * d + d * d))
    }
    case 'cylinder': {
      const [d, h] = v
      return L(Math.PI * (d / 2) ** 2 * h)
    }
    case 'rectangular':
    case 'cuboid': {
      const [l, w, h] = v
      return L(l * w * h)
    }
    case 'squarePyramid': {
      const [a1, a2, h] = v
      const A1 = a1 * a1, A2 = a2 * a2
      return L((h / 3) * (A1 + A2 + Math.sqrt(A1 * A2)))
    }
    default:
      return null
  }
}

/** Only the dimensions the shape uses, as positive millimetres (at most 100 m each). */
export function cleanDimensions(kind: ShapeKind, shape: string, input: unknown): Record<string, number> | null {
  const keys = SHAPES[kind][shape]
  if (!keys || !input || typeof input !== 'object') return null
  const out: Record<string, number> = {}
  for (const k of keys) {
    const x = Number((input as Record<string, unknown>)[k])
    if (!Number.isFinite(x) || x <= 0 || x > 100_000) return null
    out[k] = Math.round(x)
  }
  return out
}
