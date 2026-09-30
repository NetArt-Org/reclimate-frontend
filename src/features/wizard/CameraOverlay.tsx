"use client"

import { useEffect, useRef, useState } from "react"
import { Icon, MediaView } from "@/components/common"
import type { Dict } from "@/data/i18n"
import { fileToJpeg, frameToJpeg } from "@/lib/image"
import { cn } from "@/lib/utils"
import type { MediaItem } from "@/types"

export interface CameraViewModel {
  title: string
  hint: string
  counter: string
  tip: string
  video: boolean
  /** Selfie camera (profile photo). */
  front: boolean
  /** Slow internet mode: smaller photos and lighter videos. */
  slow: boolean
  /** Most recent capture for this field. */
  last: MediaItem | null
  onCapture: (file: Blob) => void
  onClose: () => void
}

const VIDEO_SECONDS = 5

const Corner = ({ className }: { className: string }) => (
  <div className={cn("absolute size-[34px] border-white", className)} />
)

const canStream = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia
const canRecord = () => typeof MediaRecorder !== "undefined"

/**
 * Guided camera.
 *  - Shows a live viewfinder when the webview/browser allows camera access.
 *  - Otherwise the shutter opens the device's own camera (or a file picker on
 *    a computer), which works everywhere without extra permissions.
 */
export function CameraOverlay({ t, cam }: { t: Dict; cam: CameraViewModel }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [live, setLive] = useState(false)
  const [recording, setRecording] = useState(false)
  const [flash, setFlash] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!canStream()) return
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { facingMode: cam.front ? "user" : "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play().catch(() => {})
        }
        setLive(true)
      })
      .catch(() => {
        /* no camera or permission denied — the shutter falls back to the file picker */
      })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [cam.front])

  const blink = () => {
    setFlash(true)
    window.setTimeout(() => setFlash(false), 350)
  }

  const record = (stream: MediaStream) => {
    const type = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m))
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: cam.slow ? 800_000 : 2_500_000 })
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    recorder.onstop = () => {
      setRecording(false)
      if (chunks.length) cam.onCapture(new Blob(chunks, { type: recorder.mimeType || type || "video/webm" }))
    }
    setRecording(true)
    recorder.start()
    window.setTimeout(() => recorder.state !== "inactive" && recorder.stop(), VIDEO_SECONDS * 1000)
  }

  const shutter = async () => {
    if (recording || busy) return
    const stream = streamRef.current
    const video = videoRef.current
    if (!live || !stream || !video || (cam.video && !canRecord())) {
      fileRef.current?.click()
      return
    }
    if (cam.video) {
      record(stream)
      return
    }
    blink()
    const blob = await frameToJpeg(video, cam.slow)
    if (blob) cam.onCapture(blob)
  }

  const picked = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    const blob = file.type.startsWith("video") ? file : await fileToJpeg(file, cam.slow)
    setBusy(false)
    cam.onCapture(blob)
  }

  return (
    <div className="absolute inset-0 z-50 flex animate-fade-in flex-col bg-night text-white">
      <div className="flex flex-none items-center gap-2.5 px-4 pt-11 pb-2.5">
        <button
          type="button"
          onClick={cam.onClose}
          aria-label="Close camera"
          className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-white/12"
        >
          <Icon name="x" size={24} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-extrabold">{cam.title}</div>
          <div className="text-sm text-[#B7BDB9]">{cam.hint}</div>
        </div>
        <div className="rounded-xl bg-white/12 px-3 py-2 text-base font-extrabold">{cam.counter}</div>
      </div>

      <div className="relative mx-4 my-1.5 min-h-0 flex-1 overflow-hidden rounded-3xl bg-stripe-camera">
        <video
          ref={videoRef}
          muted
          playsInline
          className={cn("absolute inset-0 size-full object-cover", !live && "hidden", cam.front && "-scale-x-100")}
        />
        <Corner className="top-4 left-4 rounded-tl-lg border-t-3 border-l-3" />
        <Corner className="top-4 right-4 rounded-tr-lg border-t-3 border-r-3" />
        <Corner className="bottom-4 left-4 rounded-bl-lg border-b-3 border-l-3" />
        <Corner className="right-4 bottom-4 rounded-br-lg border-r-3 border-b-3" />
        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center text-[15px] font-semibold text-[#B7BDB9]">
            <Icon name={cam.video ? "video" : "camera"} size={34} />
            {t.camOpen}
          </div>
        )}
        {recording && (
          <div className="absolute top-[18px] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[rgba(184,58,42,.9)] px-3 py-1.5 text-[15px] font-extrabold">
            <span className="size-2.5 animate-blink rounded-full bg-white" />
            {t.rec}
          </div>
        )}
        <div className="absolute right-3.5 bottom-[62px] left-3.5 flex items-center gap-2.5 rounded-2xl bg-[rgba(14,16,15,.78)] p-2.5">
          <div className="flex size-11 flex-none items-center justify-center rounded-xl bg-white/12 text-[#9BE0B6]">
            <Icon name="thumbs-up" size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-extrabold text-[#9BE0B6]">{t.camGood}</div>
            <div className="mt-0.5 text-[15px] leading-[1.3] font-semibold">{cam.tip}</div>
          </div>
        </div>
        {flash && <div className="pointer-events-none absolute inset-0 animate-flash bg-white" />}
      </div>

      <div className="flex h-[132px] flex-none items-center justify-between px-7 pb-safe">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={t.gallery}
          className="relative flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-[14px] border-2 border-white/30 bg-white/8"
        >
          {cam.last ? (
            <MediaView item={cam.last} thumb className="absolute inset-0 size-full object-cover" />
          ) : (
            <Icon name="images" size={24} />
          )}
        </button>
        <button
          type="button"
          onClick={() => void shutter()}
          aria-label={cam.video ? t.tapRec : t.tapTake}
          className="flex size-[84px] cursor-pointer items-center justify-center rounded-full border-5 border-white active:scale-92"
        >
          {busy ? (
            <Icon name="loader-circle" size={30} className="animate-spin" />
          ) : (
            <span
              className={cn(
                "size-16 transition-all duration-200",
                cam.video ? "bg-[#D6452F]" : "bg-white",
                recording ? "rounded-xl" : "rounded-full"
              )}
            />
          )}
        </button>
        <button
          type="button"
          onClick={cam.onClose}
          className="h-12 w-16 cursor-pointer bg-transparent text-[17px] font-extrabold text-white"
        >
          {t.camDone}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        hidden
        accept={cam.video ? "video/*" : "image/*"}
        capture={cam.front ? "user" : "environment"}
        onChange={(e) => {
          void picked(e.target.files?.[0])
          e.target.value = ""
        }}
      />
    </div>
  )
}
