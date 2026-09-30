"use client"

import { useRef } from "react"
import { Icon, type IconName } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import type { Dict } from "@/data/i18n"
import { cn } from "@/lib/utils"

function SheetAction({ icon, label, danger, onClick }: { icon: IconName; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[60px] cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] px-3.5 text-left",
        danger ? "border-[#E9C9C2] text-danger" : "border-[#E4DDCF]"
      )}
    >
      <Icon name={icon} size={22} className={danger ? undefined : "text-brand"} />
      <span className="flex-1 text-[17px] font-bold">{label}</span>
    </button>
  )
}

export function PhotoSheet({
  t,
  open,
  hasPhoto,
  onTake,
  onGallery,
  onRemove,
  onClose,
}: {
  t: Dict
  open: boolean
  hasPhoto: boolean
  onTake: () => void
  onGallery: (file: File) => void
  onRemove: () => void
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetTitle>{t.editPhoto}</SheetTitle>
        <SheetAction icon="camera" label={t.takePhoto} onClick={onTake} />
        <SheetAction icon="images" label={t.gallery} onClick={() => fileRef.current?.click()} />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onGallery(file)
            e.target.value = ""
          }}
        />
        {hasPhoto && <SheetAction icon="trash-2" label={t.removePhoto} danger onClick={onRemove} />}
      </SheetContent>
    </Sheet>
  )
}

export function LogoutSheet({
  t,
  open,
  onConfirm,
  onClose,
}: {
  t: Dict
  open: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetTitle>{t.logoutQ}</SheetTitle>
        <div className="text-base text-ink-muted">{t.logoutSub}</div>
        <div className="mt-1.5 flex gap-2.5">
          <Button variant="neutral" size="lg" className="flex-1 rounded-2xl" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="danger" size="lg" className="flex-1 rounded-2xl" onClick={onConfirm}>
            {t.logout}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
