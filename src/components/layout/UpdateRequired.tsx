"use client"

import { Icon } from "@/components/common"
import { Button } from "@/components/ui/button"
import { translations } from "@/data/i18n"

const PLAY_STORE = "https://play.google.com/store/apps/details?id=ai.reclimate.artisanpro"

/** Full-screen block shown when the backend no longer serves this app version (see the backend's MIN_APP_VERSION). */
export function UpdateRequired({ lang, storeUrl }: { lang: keyof typeof translations; storeUrl?: string }) {
  const tt = translations[lang] ?? translations.en
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-8 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon name="info" size={36} />
      </span>
      <h1 className="text-2xl font-extrabold text-ink">{tt.updateTitle}</h1>
      <p className="max-w-sm text-[15px] text-ink-muted">{tt.updateSub}</p>
      <Button size="lg" className="w-full max-w-xs" onClick={() => window.open(storeUrl || PLAY_STORE, "_blank", "noopener")}>
        {tt.updateBtn}
      </Button>
    </main>
  )
}
