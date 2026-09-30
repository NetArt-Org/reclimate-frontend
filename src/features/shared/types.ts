import type { IconName } from "@/components/common"

/** Pre-resolved status pill (label already translated). */
export interface StatusView {
  label: string
  icon: IconName
  tone: "info" | "warn" | "success" | "danger"
}
