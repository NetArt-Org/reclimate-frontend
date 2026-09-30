"use client"

import { Icon, type IconName } from "@/components/common"

/** Dark floating toast, raised above the tab bar when one is visible. */
export function Toast({ msg, icon, raised }: { msg: string; icon: IconName; raised: boolean }) {
  return (
    <div
      role="status"
      className="absolute left-1/2 z-70 flex w-max max-w-[330px] -translate-x-1/2 animate-toast-in items-center gap-2.5 rounded-2xl bg-ink px-4 py-3 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(0,0,0,.25)]"
      style={{ bottom: raised ? 100 : 40 }}
    >
      <Icon name={icon} size={20} className="flex-none text-[#9BE0B6]" />
      <span>{msg}</span>
    </div>
  )
}
