"use client"

import { Icon, type IconName } from "@/components/common"
import { cn } from "@/lib/utils"

export interface NavItem {
  key: string
  icon: IconName
  label: string
  active: boolean
  onSelect: () => void
}

function NavButton({ item }: { item: NavItem }) {
  return (
    <button
      type="button"
      onClick={item.onSelect}
      aria-current={item.active ? "page" : undefined}
      className={cn(
        "flex h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-1",
        item.active ? "text-brand" : "text-ink-muted"
      )}
    >
      <span
        className={cn(
          "flex h-[30px] w-14 items-center justify-center rounded-[15px] transition-colors",
          item.active && "bg-brand-soft"
        )}
      >
        <Icon name={item.icon} size={22} />
      </span>
      <span className={cn("text-[13px]", item.active ? "font-extrabold" : "font-semibold")}>{item.label}</span>
    </button>
  )
}

/**
 * Bottom tab bar. When `center` is given (worker app) a raised round
 * "Start" button sits between the left and right items.
 */
export function BottomNav({
  items,
  center,
}: {
  items: NavItem[]
  center?: { label: string; onPress: () => void }
}) {
  const half = Math.ceil(items.length / 2)
  const left = center ? items.slice(0, half) : items
  const right = center ? items.slice(half) : []
  return (
    <nav className="relative flex min-h-[84px] flex-none items-start border-t border-line bg-surface px-2 pt-2 pb-safe">
      {left.map((i) => (
        <NavButton key={i.key} item={i} />
      ))}
      {center && (
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={center.onPress}
            className="-mt-[26px] flex size-[68px] cursor-pointer flex-col items-center justify-center rounded-full border-5 border-cream bg-brand text-white shadow-[0_8px_18px_rgba(31,90,61,.4)] active:scale-95"
          >
            <Icon name="play" size={24} />
            <span className="mt-px text-[11px] font-extrabold">{center.label}</span>
          </button>
        </div>
      )}
      {right.map((i) => (
        <NavButton key={i.key} item={i} />
      ))}
    </nav>
  )
}
