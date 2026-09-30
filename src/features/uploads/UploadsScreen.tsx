"use client"

import { BackButton, Banner, EmptyState, Icon, MediaThumb, PageTitle, Screen } from "@/components/common"
import { Button } from "@/components/ui/button"
import type { Dict } from "@/data/i18n"
import { cn } from "@/lib/utils"
import type { MediaItem, UploadStatus } from "@/types"

export interface UploadsScreenProps {
  t: Dict
  offline: boolean
  items: { id: string; name: string; media: MediaItem; status: UploadStatus; statusText: string; onRetry: () => void }[]
  onSyncAll: () => void
  onBack: () => void
}

const statusColor: Record<UploadStatus, string> = { failed: "text-danger", uploading: "text-info", waiting: "text-warn" }

export function UploadsScreen(p: UploadsScreenProps) {
  const { t } = p
  return (
    <Screen sub className="gap-3.5">
      <BackButton label={t.back} onClick={p.onBack} />
      <PageTitle size="md">{t.uploadsTitle}</PageTitle>
      {p.offline && (
        <Banner tone="warn" icon="wifi-off" className="items-center px-3.5">
          {t.offlineToast}
        </Banner>
      )}
      {p.items.length === 0 && <EmptyState icon="cloud-check" title={t.uploadsEmpty} sub={t.uploadsEmptySub} />}
      {p.items.map((u) => (
        <div key={u.id} className="flex items-center gap-3 rounded-[18px] border border-line bg-surface p-3">
          <MediaThumb kind={u.media.kind} media={u.media} plain className="size-[52px] flex-none" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold">{u.name}</div>
            <div className={cn("mt-0.5 text-[13px] font-bold", statusColor[u.status])}>{u.statusText}</div>
          </div>
          {u.status === "uploading" ? (
            <Icon name="loader-circle" size={24} className="animate-spin text-info" />
          ) : (
            <Button variant="outline" size="sm" className="border-[1.5px]" onClick={u.onRetry}>
              {t.retry}
            </Button>
          )}
        </div>
      ))}
      {p.items.length > 0 && (
        <Button variant="flat" size="lg" onClick={p.onSyncAll}>
          <Icon name="cloud-upload" size={20} />
          {t.syncNow}
        </Button>
      )}
    </Screen>
  )
}
