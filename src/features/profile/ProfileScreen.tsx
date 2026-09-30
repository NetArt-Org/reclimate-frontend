"use client"

import { Icon, Screen, Segmented, SettingsRow, UserAvatar } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import type { Dict } from "@/data/i18n"
import { cn } from "@/lib/utils"
import type { Lang, MediaItem } from "@/types"

export interface ProfileScreenProps {
  t: Dict
  name: string
  role: string
  phone: string
  site: string
  initials: string
  photo: MediaItem | null
  avatarTone: "clay" | "brand"
  lang: Lang
  slow: boolean
  /** Worker-only rows (uploads, site setup, supervisors). */
  isWorker: boolean
  pendingUploads: number
  onOpenPhoto: () => void
  onEdit: () => void
  onLangChange: (l: Lang) => void
  onToggleSlow: () => void
  onOpenUploads: () => void
  onOpenSetup: () => void
  onOpenSupervisors: () => void
  onSwitchRole: () => void
  onRefresh: () => void
  onLogout: () => void
}

const Chevron = () => <Icon name="chevron-right" size={20} className="text-ink-subtle" />

export function ProfileScreen(p: ProfileScreenProps) {
  const { t } = p
  return (
    <Screen>
      <Card className="flex items-center gap-3.5 rounded-[22px] p-4">
        <UserAvatar
          initials={p.initials}
          photo={p.photo}
          tone={p.avatarTone}
          size={64}
          editable
          onClick={p.onOpenPhoto}
        />
        <div className="min-w-0 flex-1">
          <div className="text-xl font-extrabold">{p.name}</div>
          <div className="mt-0.5 text-sm text-ink-muted">{p.role}</div>
          <div className="text-sm text-ink-muted">
            {p.phone} · {p.site}
          </div>
        </div>
        <Button variant="soft" size="icon" onClick={p.onEdit} aria-label={t.editProfile}>
          <Icon name="pencil" size={20} />
        </Button>
      </Card>

      <Card className="flex items-center gap-3 px-4 py-3.5">
        <Icon name="languages" size={22} className="text-brand" />
        <div className="flex-1 text-base font-bold">{t.language}</div>
        <Segmented
          value={p.lang}
          onChange={p.onLangChange}
          itemClassName="h-10"
          options={[
            { value: "en", label: "EN" },
            { value: "id", label: "ID" },
          ]}
        />
      </Card>

      <Card className="overflow-hidden">
        <SettingsRow
          icon="gauge"
          title={t.slow}
          sub={t.slowSub}
          onClick={p.onToggleSlow}
          trailing={<Switch checked={p.slow} tabIndex={-1} className="pointer-events-none" />}
        />
        {p.isWorker && (
          <>
            <SettingsRow
              icon="cloud-upload"
              title={t.pendingUp}
              onClick={p.onOpenUploads}
              trailing={
                <>
                  <span
                    className={cn(
                      "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-extrabold",
                      p.pendingUploads ? "bg-warn-soft text-warn" : "bg-success-soft text-success"
                    )}
                  >
                    {p.pendingUploads}
                  </span>
                  <Chevron />
                </>
              }
            />
            <SettingsRow icon="settings-2" title={t.siteSetup} sub={t.siteSetupSub} onClick={p.onOpenSetup} trailing={<Chevron />} />
            <SettingsRow icon="shield-check" title={t.supervisors} onClick={p.onOpenSupervisors} trailing={<Chevron />} />
          </>
        )}
      </Card>

      <Card className="overflow-hidden">
        <SettingsRow icon="repeat" title={t.switchRole} sub={t.switchRoleSub} onClick={p.onSwitchRole} trailing={<Chevron />} />
        <SettingsRow icon="rotate-ccw" title={t.reset} onClick={p.onRefresh} />
      </Card>

      <Button variant="danger-soft" size="md" className="h-[54px]" onClick={p.onLogout}>
        <Icon name="log-out" size={20} />
        {t.logout}
      </Button>
      <p className="text-center text-[13px] text-ink-muted">{t.version}</p>
    </Screen>
  )
}
