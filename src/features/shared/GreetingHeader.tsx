"use client"

import { Icon, UserAvatar } from "@/components/common"
import { cn } from "@/lib/utils"
import type { MediaItem } from "@/types"

export interface GreetingHeaderProps {
  hello: string
  name: string
  initials: string
  photo: MediaItem | null
  avatarTone: "clay" | "brand"
  online: boolean
  onlineLabel: string
  site: string
  onOpenPhoto: () => void
  onOpenSite: () => void
}

/** Avatar · greeting · online pill, then the site picker button. */
export function GreetingHeader(p: GreetingHeaderProps) {
  return (
    <>
      <div className="flex items-center gap-3">
        <UserAvatar initials={p.initials} photo={p.photo} tone={p.avatarTone} onClick={p.onOpenPhoto} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] text-ink-muted">{p.hello}</div>
          <div className="text-[21px] font-extrabold tracking-[-.3px]">{p.name}</div>
        </div>
        {/* The phone's real connection: work is saved on the phone and sent when it is back online. */}
        <div
          role="status"
          className={cn(
            "flex h-10 items-center gap-[7px] rounded-full px-3.5 text-sm font-bold",
            p.online ? "bg-success-soft text-success" : "bg-warn-soft text-warn"
          )}
        >
          <Icon name={p.online ? "wifi" : "wifi-off"} size={17} />
          <span>{p.onlineLabel}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={p.onOpenSite}
        className="flex h-11 cursor-pointer items-center gap-2 self-start rounded-[14px] border border-[#E1D9C8] bg-surface pr-3.5 pl-3 text-base font-bold text-ink active:scale-[.97]"
      >
        <Icon name="map-pin" size={18} className="text-brand" />
        <span>{p.site}</span>
        <Icon name="chevron-down" size={18} className="text-ink-muted" />
      </button>
    </>
  )
}
