"use client"

import { useEffect } from "react"

/**
 * Something on screen broke: instead of a blank white app, offer a way back. Work saved on the phone (drafts,
 * pending uploads) lives in storage, so trying again or restarting loses nothing.
 */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => console.error("[app] screen error", error), [error])
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-8 text-center">
      <h1 className="text-2xl font-extrabold text-ink">Something went wrong</h1>
      <p className="max-w-sm text-[15px] text-ink-muted">
        Your saved work is safe on this phone. Tap below to try again.
        <br />
        Terjadi kesalahan. Data Anda aman di ponsel ini — ketuk di bawah untuk mencoba lagi.
      </p>
      <button className="h-14 w-full max-w-xs rounded-[18px] bg-brand text-[17px] font-extrabold text-white" onClick={() => retry()}>
        Try again · Coba lagi
      </button>
      <button className="text-[15px] font-bold text-brand" onClick={() => window.location.reload()}>
        Restart the app · Mulai ulang
      </button>
    </main>
  )
}
