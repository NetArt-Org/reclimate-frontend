import type { IconName } from "@/components/common"
import type { MediaItem } from "@/types"

/** Pre-resolved view models for each wizard field type. */
export type WizardFieldView =
  | {
      type: "choice"
      key: string
      label: string
      options: { value: string; label: string; sub: string | null; icon: IconName; selected: boolean; onPick: () => void }[]
      add: { label: string; onPress: () => void } | null
    }
  | {
      type: "number"
      key: string
      label: string
      value: string
      unit: string
      units: { label: string; selected: boolean; onPick: () => void }[] | null
      hint: string | null
      warn: string | null
      state: "idle" | "valid" | "invalid"
      onChange: (v: string) => void
    }
  | {
      type: "media"
      key: string
      label: string
      count: string
      done: boolean
      kind: "photo" | "video"
      slots: { media: MediaItem | null; pending: boolean; next: boolean; label: string; onOpen: () => void }[]
    }
  | {
      type: "moist"
      key: string
      label: string
      count: string
      done: boolean
      tooWetLabel: string
      rows: { n: number; value: string; wet: boolean; ok: boolean; photo: MediaItem | null; onChange: (v: string) => void; onSnap: () => void }[]
    }
  | {
      type: "timer"
      key: string
      started: boolean
      elapsed: string
      startedAt: string
      onStart: () => void
    }
  | {
      type: "loc"
      key: string
      label: string
      coords: string | null
      onCapture: () => void
    }

export interface WizardViewModel {
  stepKey: string
  dayTitle: string
  stepText: string
  batchLabel: string
  segments: { state: "done" | "current" | "reached" | "todo"; onClick: () => void }[]
  burnTime: string | null
  illustration: string
  title: string
  instructions: string
  fields: WizardFieldView[]
  chips: { label: string; done: boolean }[]
  missing: string | null
  ready: boolean
  doneLabel: string
  doneIcon: IconName
  saving: boolean
  onDone: () => void
  onExit: () => void
}
