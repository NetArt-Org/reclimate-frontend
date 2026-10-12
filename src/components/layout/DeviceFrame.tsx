"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Icon } from "@/components/common"
import { PortalContainerContext } from "@/lib/portal-container"

/**
 * App viewport.
 *  - Phone / Capacitor webview: full-screen, respects safe-area insets.
 *  - Desktop browser (md+): centred inside a 390×844 phone frame, as in the design.
 * Overlays portal into this element so they stay inside the "phone".
 */
export function DeviceFrame({ online, children }: { online: boolean; children: ReactNode }) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream md:bg-backdrop md:p-3">
      <div
        ref={setRoot}
        className="relative flex h-dvh w-full flex-col overflow-hidden bg-cream text-ink md:h-[min(844px,calc(100dvh-24px))] md:w-[390px] md:rounded-[44px] md:shadow-[0_0_0_10px_#1B1F1D,0_30px_60px_rgba(30,35,32,.28)]"
      >
        <StatusBar online={online} />
        <PortalContainerContext.Provider value={root}>{children}</PortalContainerContext.Provider>
      </div>
    </div>
  )
}

/** Mock iOS status bar — only drawn in the desktop frame; native devices draw their own. */
function StatusBar({ online }: { online: boolean }) {
  const [time, setTime] = useState("")
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }))
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <>
      <div className="pt-safe md:hidden" />
      <div className="hidden h-[34px] flex-none items-center justify-between px-7 pt-1 text-sm font-bold md:flex">
        <span>{time}</span>
        <div className="flex items-center gap-1.5">
          <Icon name="signal" size={16} />
          <Icon name={online ? "wifi" : "wifi-off"} size={16} />
          <Icon name="battery-medium" size={20} />
        </div>
      </div>
    </>
  )
}
