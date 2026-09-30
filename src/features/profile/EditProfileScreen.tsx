"use client"

import {
  BackButton, FieldLabel, FieldNote, FieldShell, Icon, PageTitle, ScreenWithFooter, UserAvatar, type IconName,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { CardList } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Dict } from "@/data/i18n"
import type { MediaItem } from "@/types"

export interface EditField {
  key: string
  label: string
  icon: IconName
  type: "text" | "tel" | "email"
  placeholder: string
  value: string
  error: string | null
  onChange: (v: string) => void
}

export interface EditProfileScreenProps {
  t: Dict
  initials: string
  photo: MediaItem | null
  avatarTone: "clay" | "brand"
  fields: EditField[]
  role: string
  site: string
  canSave: boolean
  onOpenPhoto: () => void
  onSave: () => void
  onBack: () => void
}

export function EditProfileScreen(p: EditProfileScreenProps) {
  const { t } = p
  return (
    <ScreenWithFooter
      footer={
        <Button size="xl" variant={p.canSave ? "flat" : "disabled"} className="w-full gap-2.5" onClick={p.onSave}>
          <Icon name="check" size={22} />
          {t.saveChanges}
        </Button>
      }
    >
      <BackButton label={t.back} onClick={p.onBack} />
      <PageTitle size="md">{t.editProfile}</PageTitle>
      <div className="flex flex-col items-center gap-2 pt-1.5 pb-1">
        <UserAvatar
          initials={p.initials}
          photo={p.photo}
          tone={p.avatarTone}
          size={96}
          editable
          ringClass="border-cream"
          onClick={p.onOpenPhoto}
        />
        <Button variant="link" size="pill" onClick={p.onOpenPhoto} className="text-[15px] font-extrabold">
          {t.changePhoto}
        </Button>
      </div>

      {p.fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-2">
          <FieldLabel>{f.label}</FieldLabel>
          <FieldShell icon={f.icon} invalid={!!f.error}>
            <Input
              type={f.type}
              value={f.value}
              placeholder={f.placeholder}
              onChange={(e) => f.onChange(e.target.value)}
              aria-invalid={!!f.error}
            />
          </FieldShell>
          {f.error && (
            <FieldNote icon="triangle-alert" tone="danger">
              {f.error}
            </FieldNote>
          )}
        </div>
      ))}

      <CardList className="rounded-[18px]">
        <div className="flex items-center gap-3 border-b border-line-soft py-3">
          <Icon name="id-card" size={20} className="text-ink-subtle" />
          <div className="flex-1 text-sm font-bold text-ink-muted">{t.roleLbl}</div>
          <div className="text-right text-[15px] font-bold">{p.role}</div>
        </div>
        <div className="flex items-center gap-3 py-3">
          <Icon name="map-pin" size={20} className="text-ink-subtle" />
          <div className="flex-1 text-sm font-bold text-ink-muted">{t.siteLbl}</div>
          <div className="text-[15px] font-bold">{p.site}</div>
        </div>
      </CardList>
      <FieldNote icon="lock">
        <span className="font-normal">{t.managedByAdmin}</span>
      </FieldNote>
    </ScreenWithFooter>
  )
}
