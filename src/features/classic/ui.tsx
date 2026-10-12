"use client"

import type { ReactNode } from "react"
import { Icon, MediaView, type IconName, type MoreProps } from "@/components/common"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { MediaItem } from "@/types"

/**
 * Building blocks of the Classic app (the Circonomy field app existing users know): white screens, teal accents,
 * cards with a light teal border, a 5-tab bottom bar and a side drawer. Pure components: everything comes as props.
 */

export function ClassicScreen({ children, className }: { children: ReactNode; className?: string }) {
  // Children keep their height (a scrolling flex column would otherwise squash cards with overflow-hidden).
  return <div className={cn("absolute inset-0 flex flex-col overflow-y-auto bg-cl-bg pb-28 text-cl-ink no-scrollbar [&>*]:shrink-0", className)}>{children}</div>
}

/** Top bar: menu, site picker, a key figure, support. */
export function ClassicHeader(p: { site: string; figure?: string | null; onMenu: () => void; onSite: () => void; onSupport: () => void; menuLabel: string; supportLabel: string }) {
  return (
    <div className="sticky top-0 z-10 flex flex-none items-center gap-2 bg-cl-bg px-3 pt-2 pb-2">
      <button type="button" onClick={p.onMenu} aria-label={p.menuLabel} className="flex size-11 cursor-pointer items-center justify-center rounded-full text-cl-ink">
        <Icon name="menu" size={26} />
      </button>
      <button
        type="button"
        onClick={p.onSite}
        className="flex h-12 min-w-0 max-w-[48%] cursor-pointer items-center gap-1.5 rounded-xl px-3 text-[19px] shadow-[0_1px_4px_rgba(0,0,0,.18)]"
      >
        <span className="truncate">{p.site || "—"}</span>
        <Icon name="chevron-down" size={18} className="flex-none" />
      </button>
      {p.figure && (
        <span className="flex items-center gap-1 text-[17px] font-bold whitespace-nowrap">
          <Icon name="wheat" size={20} />
          {p.figure}
        </span>
      )}
      <button type="button" onClick={p.onSupport} aria-label={p.supportLabel} className="ml-auto flex size-11 cursor-pointer items-center justify-center rounded-full text-cl">
        <Icon name="headset" size={26} />
      </button>
    </div>
  )
}

export interface ClassicNavItem {
  key: string
  icon: IconName
  label: string
  active: boolean
  onSelect: () => void
}

export function ClassicBottomNav({ items }: { items: ClassicNavItem[] }) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-20 flex border-t border-[#e8e8e8] bg-cl-bg px-1 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={it.onSelect}
          aria-current={it.active ? "page" : undefined}
          className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1 text-[13px] leading-tight text-cl-ink"
        >
          <span className={cn("flex h-9 w-16 items-center justify-center rounded-full", it.active ? "bg-cl text-white" : "text-cl-ink")}>
            <Icon name={it.icon} size={22} />
          </span>
          <span className={cn("text-center", it.active && "font-semibold")}>{it.label}</span>
        </button>
      ))}
    </nav>
  )
}

/** Two-way tab strip under the header ("Ongoing | Completed"). */
export function ClassicTabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-none border-b border-[#e3e3e3]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn("relative flex-1 cursor-pointer py-3 text-[17px]", o.value === value ? "font-semibold text-cl-ink" : "text-cl-muted")}
        >
          {o.label}
          {o.value === value && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-cl" />}
        </button>
      ))}
    </div>
  )
}

/** Pill chips ("Farmer | Buyers", kiln filter). */
export function ClassicChips<T extends string>({ value, options, onChange, className }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto px-3 py-2.5 no-scrollbar", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "h-11 flex-none cursor-pointer rounded-full border px-5 text-[16px] whitespace-nowrap",
            o.value === value ? "border-cl bg-cl text-white" : "border-cl-ink/40 bg-white text-cl-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ClassicCard({ children, className, tone, onClick }: { children: ReactNode; className?: string; tone?: "warn" | "info"; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={cn(
        "mx-3 rounded-2xl border p-4",
        tone === "warn" ? "border-cl-warn bg-cl-warn/60 shadow-[0_2px_6px_rgba(0,0,0,.12)]" : tone === "info" ? "border-cl-line bg-cl-soft" : "border-cl-line bg-white",
        onClick && "cursor-pointer active:scale-[.99]",
        className
      )}
    >
      {children}
    </div>
  )
}

/** Summary pill under the tabs ("Biochar-Only: 391.116 kL | Mixed: 0.040 kL"). */
export function ClassicSummary({ children }: { children: ReactNode }) {
  return <div className="mx-3 my-3 rounded-2xl border border-cl-line px-4 py-4 text-center text-[17px] shadow-[0_1px_4px_rgba(0,0,0,.08)]">{children}</div>
}

export function ClassicFab({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      className="absolute right-5 bottom-28 z-20 flex size-[66px] cursor-pointer items-center justify-center rounded-full bg-cl text-white shadow-[0_6px_14px_rgba(0,0,0,.25)] active:scale-95"
    >
      <Icon name="plus" size={32} />
    </button>
  )
}

export function ClassicEmpty({ text }: { text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 py-12 text-center">
      <div className="flex size-36 items-center justify-center rounded-full bg-cl-soft text-cl">
        <Icon name="cloud-upload" size={64} />
      </div>
      <p className="text-[17px] text-cl-ink">{text}</p>
    </div>
  )
}

export function ClassicMore({ more }: { more: MoreProps | null | undefined }) {
  if (!more) return null
  return (
    <button type="button" onClick={more.onPress} disabled={more.loading} className="mx-3 mt-1 mb-3 h-12 cursor-pointer rounded-xl border border-cl-line text-[16px] font-semibold text-cl disabled:opacity-60">
      {more.label}
    </button>
  )
}

/** Labelled row: "Biomass Qty: 792 kg". */
export function KV({ k, v, className }: { k: string; v: ReactNode; className?: string }) {
  return (
    <div className={cn("text-[16px]", className)}>
      <span className="font-semibold">{k}:</span> <span className="text-cl-ink">{v}</span>
    </div>
  )
}

export function Thumbs({ items, max = 3, onOpen }: { items: MediaItem[]; max?: number; onOpen?: () => void }) {
  if (!items.length) return null
  const shown = items.slice(0, max)
  return (
    <div className="mt-2.5 flex gap-2" onClick={onOpen}>
      {shown.map((m) => (
        <div key={m.id} className="relative size-14 overflow-hidden rounded-lg bg-cl-soft">
          <MediaView item={m} thumb className="size-full object-cover" />
          {m.kind === "video" && (
            <span className="absolute inset-0 flex items-center justify-center text-white">
              <Icon name="play" size={20} />
            </span>
          )}
        </div>
      ))}
      {items.length > max && <div className="flex size-14 items-center justify-center rounded-lg bg-[#ddd] text-[17px] font-semibold">+{items.length - max}</div>}
    </div>
  )
}

/* ---------------- forms ---------------- */

export function FormScreen({ title, onBack, backLabel, children, footer }: { title: string; onBack: () => void; backLabel: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-cl-bg text-cl-ink">
      <div className="flex flex-none items-center gap-3 px-3 pt-2 pb-3">
        <button type="button" onClick={onBack} aria-label={backLabel} className="flex size-11 cursor-pointer items-center justify-center rounded-full">
          <Icon name="arrow-left" size={26} />
        </button>
        <h1 className="flex-1 pr-11 text-center text-[21px] font-semibold">{title}</h1>
      </div>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-8 no-scrollbar [&>*]:shrink-0">{children}</div>
      {footer && <div className="flex-none px-5 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))]">{footer}</div>}
    </div>
  )
}

export function ClassicButton({ children, onPress, variant = "primary", disabled, className }: { children: ReactNode; onPress: () => void; variant?: "primary" | "outline" | "text"; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className={cn(
        "h-[54px] w-full cursor-pointer rounded-full text-[17px] font-semibold disabled:opacity-50",
        variant === "primary" ? "bg-cl text-white" : variant === "outline" ? "border border-cl-ink/30 bg-white text-cl" : "text-cl",
        className
      )}
    >
      {children}
    </button>
  )
}

export function ClassicInput(p: { label: string; value: string; onChange: (v: string) => void; type?: "text" | "number" | "tel"; suffix?: string; readOnly?: boolean; multiline?: boolean }) {
  const common = "min-w-0 flex-1 bg-transparent text-[18px] outline-none placeholder:text-cl-muted"
  return (
    <label className={cn("flex min-h-[64px] items-center gap-2 rounded-xl border border-[#c9c9c9] px-5", p.readOnly && "bg-[#fafafa] text-cl-muted")}>
      {p.multiline ? (
        <textarea rows={2} placeholder={p.label} value={p.value} readOnly={p.readOnly} onChange={(e) => p.onChange(e.target.value)} aria-label={p.label} className={cn(common, "resize-none py-4")} />
      ) : (
        <input
          type={p.type === "number" ? "text" : (p.type ?? "text")}
          inputMode={p.type === "number" ? "decimal" : p.type === "tel" ? "tel" : undefined}
          placeholder={p.label}
          value={p.value}
          readOnly={p.readOnly}
          onChange={(e) => p.onChange(p.type === "number" ? e.target.value.replace(/[^\d.]/g, "") : e.target.value)}
          aria-label={p.label}
          className={common}
        />
      )}
      {p.suffix && <span className="flex-none text-[17px] font-medium">{p.suffix}</span>}
    </label>
  )
}

export function ClassicSelect(p: { label: string; value: string; options: { value: string; label: string; disabled?: boolean }[]; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={cn("relative flex h-[64px] items-center rounded-xl border border-[#c9c9c9] px-5", p.className)}>
      <select value={p.value} onChange={(e) => p.onChange(e.target.value)} aria-label={p.label} className="h-full min-w-0 flex-1 appearance-none bg-transparent pr-6 text-[18px] outline-none">
        <option value="">{p.label}</option>
        {p.options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-5 border-x-[6px] border-t-[7px] border-x-transparent border-t-cl" />
    </label>
  )
}

export function Toggle2<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-3">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn("h-12 cursor-pointer rounded-full border px-7 text-[17px]", o.value === value ? "border-cl bg-cl text-white" : "border-cl-ink/30 text-cl")}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** "Add images" tiles: captured items, then an add tile. */
export function MediaAdd(p: { label: string; required?: boolean; kind: "photo" | "video"; items: MediaItem[]; onAdd: () => void; onRemove?: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[18px] font-medium">
        {p.label}
        {p.required && <span className="text-cl-bad"> *</span>}
      </div>
      <div className="flex flex-wrap gap-3">
        {p.items.map((m) => (
          <div key={m.id} className="relative size-[84px] overflow-hidden rounded-lg bg-cl-soft">
            <MediaView item={m} thumb className="size-full object-cover" />
            {p.onRemove && (
              <button type="button" onClick={() => p.onRemove!(m.id)} aria-label="Remove" className="absolute top-1 right-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white">
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={p.onAdd} aria-label={p.label} className={cn("flex size-[84px] cursor-pointer items-center justify-center rounded-lg text-cl", p.kind === "video" ? "bg-[#d6e6fb]" : "bg-cl-tile")}>
          <Icon name={p.kind === "video" ? "video" : "image-check"} size={28} />
        </button>
      </div>
    </div>
  )
}

export function ClassicSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="bg-white text-cl-ink">
        <SheetTitle className="text-center text-[21px] font-semibold">{title}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  )
}
