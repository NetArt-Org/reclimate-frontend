"use client"

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toneBanner, toneSoft, type Tone } from "@/lib/tones"
import type { MediaItem } from "@/types"
import { Icon, type IconName } from "./Icon"
import { MediaView } from "./MediaView"

export { Icon, type IconName } from "./Icon"
export { MediaView } from "./MediaView"

/* ------------------------------------------------------------------ */
/* Screen scaffolding                                                  */
/* ------------------------------------------------------------------ */

/** Full-height scrolling screen body. `sub` screens slide in from the right. */
export function Screen({
  children,
  sub = false,
  className,
}: {
  children: ReactNode
  sub?: boolean
  className?: string
}) {
  return (
    <div className={cn("absolute inset-0 overflow-y-auto no-scrollbar", sub && "bg-cream animate-step-in")}>
      <div className={cn("flex flex-col gap-4", sub ? "px-5 pt-1 pb-7" : "px-5 pt-2 pb-7", className)}>{children}</div>
    </div>
  )
}

/** Sub-screen with a pinned action bar at the bottom (Save, Accept/Reject…). */
export function ScreenWithFooter({
  children,
  footer,
  className,
}: {
  children: ReactNode
  footer: ReactNode
  className?: string
}) {
  return (
    <div className="absolute inset-0 flex flex-col bg-cream animate-step-in">
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <div className={cn("flex flex-col gap-3.5 px-5 pt-1 pb-6", className)}>{children}</div>
      </div>
      <FooterBar>{footer}</FooterBar>
    </div>
  )
}

export function FooterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-none gap-2.5 border-t border-line bg-surface px-5 pt-3 pb-[18px] shadow-[0_-6px_18px_rgba(30,35,32,.05)]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 cursor-pointer items-center gap-1.5 self-start bg-transparent pr-3.5 pl-1.5 text-base font-bold text-ink"
    >
      <Icon name="arrow-left" size={24} />
      {label}
    </button>
  )
}

export function PageTitle({ children, sub, size = "lg" }: { children: ReactNode; sub?: ReactNode; size?: "lg" | "md" }) {
  return (
    <div>
      <h1 className={cn("font-extrabold", size === "lg" ? "text-[26px] tracking-[-.5px]" : "text-2xl tracking-[-.4px]")}>
        {children}
      </h1>
      {sub && <p className="mt-0.5 text-[15px] text-ink-muted">{sub}</p>}
    </div>
  )
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("mt-1.5 text-lg font-extrabold", className)}>{children}</h2>
}

/** Small uppercase label above inputs / option groups. */
export function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("text-sm font-extrabold tracking-[.6px] text-ink-muted uppercase", className)}>{children}</div>
  )
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

/** Rounded square holding an icon (the design's most repeated element). */
export function IconTile({
  icon,
  tone = "clay",
  size = 48,
  iconSize,
  radius = "rounded-[14px]",
  className,
}: {
  icon: IconName
  tone?: Tone
  size?: number
  iconSize?: number
  radius?: string
  className?: string
}) {
  return (
    <div
      className={cn("flex flex-none items-center justify-center transition-all", toneSoft[tone], radius, className)}
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={iconSize ?? Math.round(size / 2)} />
    </div>
  )
}

export function StatusBadge({
  label,
  icon,
  tone,
  size = "default",
}: {
  label: string
  icon: IconName
  tone: "info" | "warn" | "success" | "danger"
  size?: "default" | "lg"
}) {
  return (
    <Badge tone={tone} size={size}>
      <Icon name={icon} />
      {label}
    </Badge>
  )
}

export function Banner({
  tone,
  icon,
  children,
  className,
}: {
  tone: keyof typeof toneBanner
  icon?: IconName
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex gap-2 rounded-[14px] p-3 text-[15px] leading-[1.4]", toneBanner[tone], className)}>
      {icon && <Icon name={icon} size={20} className="flex-none" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/** Inline helper/warning line under a field. */
export function FieldNote({ icon, tone = "muted", children }: { icon: IconName; tone?: "muted" | "danger"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-sm",
        tone === "danger" ? "font-bold text-danger" : "font-semibold text-ink-muted"
      )}
    >
      <Icon name={icon} size={16} className="flex-none" />
      {children}
    </div>
  )
}

export function StatTile({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface px-3.5 py-3", className)}>
      <div className="text-[13px] font-bold text-ink-muted">{label}</div>
      <div className="mt-[3px] text-[17px] font-extrabold">{value}</div>
    </div>
  )
}

export function StatGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((s) => (
        <StatTile key={s.label} label={s.label} value={s.value} />
      ))}
    </div>
  )
}

/** Row inside a CardList with an optional divider. */
export function ListRow({
  leading,
  title,
  sub,
  trailing,
  divider = true,
  onClick,
  className,
}: {
  leading?: ReactNode
  title: ReactNode
  sub?: ReactNode
  trailing?: ReactNode
  divider?: boolean
  onClick?: () => void
  className?: string
}) {
  const Cmp = onClick ? "button" : "div"
  return (
    <Cmp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 py-3 text-left",
        divider && "border-b border-line-soft last:border-b-0",
        onClick && "cursor-pointer",
        className
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-[1.35] font-semibold">{title}</div>
        {sub && <div className="mt-0.5 text-[13px] text-ink-muted">{sub}</div>}
      </div>
      {trailing}
    </Cmp>
  )
}

/** Settings-style row (icon · title/sub · trailing control). */
export function SettingsRow({
  icon,
  title,
  sub,
  trailing,
  onClick,
}: {
  icon: IconName
  title: string
  sub?: string
  trailing?: ReactNode
  onClick?: () => void
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && (e.key === "Enter" || e.key === " ") && onClick()}
      className="flex min-h-[52px] cursor-pointer items-center gap-3 border-b border-line-soft px-4 py-3.5 last:border-b-0"
    >
      <Icon name={icon} size={22} className="text-brand" />
      <div className="flex-1">
        <div className="text-base font-bold">{title}</div>
        {sub && <div className="text-[13px] text-ink-muted">{sub}</div>}
      </div>
      {trailing}
    </div>
  )
}

/**
 * Selectable option card — wizard choices, login roles, sites, reject reasons,
 * start-sheet actions.
 */
export function OptionCard({
  icon,
  title,
  sub,
  selected = false,
  onClick,
  trailing,
  size = "md",
  className,
}: {
  icon?: IconName
  title: ReactNode
  sub?: ReactNode
  selected?: boolean
  onClick: () => void
  trailing?: ReactNode
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-[18px] border-2 px-3.5 py-2.5 text-left transition-all active:scale-[.98]",
        size === "sm" && "min-h-[60px] rounded-2xl",
        size === "md" && "min-h-16",
        size === "lg" && "min-h-[72px] gap-3.5 py-3",
        selected ? "border-brand bg-brand-soft" : "border-line-option bg-surface",
        className
      )}
    >
      {icon && (
        <IconTile
          icon={icon}
          tone={selected ? "solid" : "clay"}
          size={size === "lg" ? 48 : 44}
          iconSize={size === "lg" ? 24 : 22}
          radius="rounded-xl"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-bold">{title}</div>
        {sub && <div className="text-sm text-ink-muted">{sub}</div>}
      </div>
      {trailing ?? (selected && <Icon name="circle-check" size={26} className="animate-pop text-brand" />)}
    </button>
  )
}

/** Pill-style segmented control (language, units, account type). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  variant = "light",
  direction = "row",
  className,
  itemClassName,
}: {
  options: { value: T; label: ReactNode; sub?: string }[]
  value: T
  onChange: (v: T) => void
  variant?: "light" | "dark" | "raised"
  direction?: "row" | "col"
  className?: string
  itemClassName?: string
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "flex gap-1 rounded-[14px] p-1",
        direction === "col" && "flex-col rounded-2xl",
        variant === "dark" ? "bg-white/14" : "bg-track",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-w-14 cursor-pointer flex-col items-center justify-center rounded-[11px] px-3 text-[15px] font-extrabold transition-all",
              variant === "light" && (active ? "bg-brand text-white" : "text-ink"),
              variant === "dark" && (active ? "bg-lime text-brand-dark" : "text-white"),
              variant === "raised" &&
                (active ? "bg-surface text-brand shadow-[0_1px_4px_rgba(30,35,32,.15)]" : "text-ink-muted"),
              itemClassName
            )}
          >
            <span>{o.label}</span>
            {o.sub && <span className="text-xs font-semibold opacity-80">{o.sub}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Bordered input container (icon · input · unit). */
export function FieldShell({
  icon,
  unit,
  invalid,
  valid,
  size = "md",
  className,
  children,
}: {
  icon?: IconName
  unit?: string
  invalid?: boolean
  valid?: boolean
  size?: "md" | "lg"
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 border-2 bg-surface px-3.5 transition-colors",
        size === "md" ? "h-[60px] rounded-2xl" : "h-[68px] gap-2 rounded-[18px] px-4",
        invalid ? "border-danger" : valid ? "border-green" : "border-line-strong",
        className
      )}
    >
      {icon && <Icon name={icon} size={20} className="flex-none text-ink-muted" />}
      {children}
      {unit && <span className={cn("font-bold text-ink-muted", size === "lg" ? "text-lg" : "text-base")}>{unit}</span>}
    </div>
  )
}

export function EmptyState({ icon, title, sub }: { icon: IconName; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-[20px] border border-line bg-surface px-5 py-7 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
        <Icon name={icon} size={32} />
      </div>
      <div className="text-lg font-extrabold">{title}</div>
      <div className="text-[15px] text-ink-muted">{sub}</div>
    </div>
  )
}

/** Striped placeholder standing in for captured photos / videos. */
export function MediaThumb({
  kind = "photo",
  plain = false,
  media,
  className,
}: {
  kind?: "photo" | "video"
  /** Hide the play badge on video thumbs (tiny previews). */
  plain?: boolean
  /** The captured file; a striped placeholder is shown while it loads. */
  media?: MediaItem | null
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-square items-center justify-center overflow-hidden rounded-xl",
        kind === "video" ? "bg-stripe-video" : "bg-stripe-photo",
        className
      )}
    >
      {media && <MediaView item={media} thumb className="absolute inset-0 size-full object-cover" />}
      {!plain &&
        kind === "video" && (
          <div className="relative flex size-[34px] items-center justify-center rounded-full bg-white/90 text-ink">
            <Icon name="play" size={16} />
          </div>
        )}
    </div>
  )
}

/** Five moisture meter photos with their readings. */
export function MoistureStrip({ readings }: { readings: { val: string; wet: boolean }[] }) {
  return (
    <div className="flex gap-2">
      {readings.map((m, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex aspect-square w-full items-center justify-center rounded-[10px] bg-stripe-meter font-mono text-[10px] text-[#CFE3D6]">
            meter
          </div>
          <div className={cn("text-[15px] font-extrabold", m.wet ? "text-danger" : "text-ink")}>{m.val}%</div>
        </div>
      ))}
    </div>
  )
}

/** Circle avatar: the profile photo, or initials when there is none. */
export function UserAvatar({
  initials,
  photo,
  size = 48,
  tone = "clay",
  editable = false,
  onClick,
  ringClass = "border-surface",
}: {
  initials: string
  photo: MediaItem | null
  size?: number
  tone?: "clay" | "brand"
  editable?: boolean
  onClick?: () => void
  ringClass?: string
}) {
  const badge = size >= 90 ? 34 : 28
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Profile photo"
      className="relative flex-none cursor-pointer rounded-full active:scale-95"
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 overflow-hidden rounded-full">
        {photo ? (
          <span className="absolute inset-0 bg-stripe-photo">
            <MediaView item={photo} thumb className="absolute inset-0 size-full object-cover" />
          </span>
        ) : (
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center font-extrabold text-white",
              tone === "brand" ? "bg-brand" : "bg-clay"
            )}
            style={{ fontSize: Math.round(size / 2.9) }}
          >
            {initials}
          </span>
        )}
      </span>
      {editable && (
        <span
          className={cn(
            "absolute right-[-2px] bottom-[-2px] flex items-center justify-center rounded-full border-2 bg-brand text-white",
            size >= 90 && "right-0 bottom-0 border-3",
            ringClass
          )}
          style={{ width: badge, height: badge }}
        >
          <Icon name="camera" size={size >= 90 ? 16 : 14} />
        </span>
      )}
    </button>
  )
}

/** Progress segments (batch days, wizard steps). */
export function Segments({
  items,
  height = 6,
  gap = 4,
}: {
  items: { className: string; onClick?: () => void }[]
  height?: number
  gap?: number
}) {
  return (
    <div className="flex" style={{ gap }}>
      {items.map((s, i) => (
        <div
          key={i}
          onClick={s.onClick}
          className={cn("flex-1 rounded-full transition-colors duration-400", s.onClick && "cursor-pointer", s.className)}
          style={{ height }}
        />
      ))}
    </div>
  )
}

/** Completion chip (✓ done / ◌ pending) shown on task cards and wizard footer. */
export function ProgressChip({ label, done, small = false }: { label: string; done: boolean; small?: boolean }) {
  return (
    <Badge tone={done ? "success" : "neutral"} size={small ? "chip-sm" : "chip"} className="transition-all duration-300">
      <Icon name={done ? "circle-check" : "circle-dashed"} />
      {label}
    </Badge>
  )
}
