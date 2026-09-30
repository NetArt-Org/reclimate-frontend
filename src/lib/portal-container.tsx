"use client"

import { createContext, useContext } from "react"

/**
 * Overlays (sheets, camera, toasts) must render inside the app screen, not
 * <body>, so they stay clipped to the phone frame on desktop. The DeviceFrame
 * provides its root element through this context.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null)

export const usePortalContainer = () => useContext(PortalContainerContext)
