"use client"

import { useEffect, useState } from "react"
import { mediaStore } from "@/lib/media-store"
import type { MediaItem } from "@/types"

/**
 * Shows a captured photo or video. The file comes from the phone while it is
 * still waiting to upload, otherwise from the backend using the signed-in
 * session — evidence files are never publicly reachable by URL.
 * Renders nothing until the file is ready, so the parent's placeholder shows through.
 */
export function MediaView({
  item,
  thumb = false,
  controls = false,
  className,
}: {
  item: MediaItem
  /** Prefer the small version (lists, tiles). */
  thumb?: boolean
  controls?: boolean
  className?: string
}) {
  const [loaded, setLoaded] = useState<{ key: string; src: string } | null>(null)
  const key = `${item.id}:${thumb}`
  const src = mediaStore.peek(item, thumb) ?? (loaded?.key === key ? loaded.src : null)

  useEffect(() => {
    let active = true
    void mediaStore.url(item, thumb).then((url) => {
      if (active && url) setLoaded({ key, src: url })
    })
    return () => {
      active = false
    }
    // Re-resolve when the file itself changes (e.g. it finished uploading), not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, item.url])

  if (!src) return null
  if (item.kind === "video") {
    return <video src={src} className={className} muted playsInline preload="metadata" controls={controls} autoPlay={controls} />
  }
  // Object URLs cannot go through next/image (and the app is a static export).
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} />
}
