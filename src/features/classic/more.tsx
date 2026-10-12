"use client"

import { Icon, MediaView } from "@/components/common"
import type { EditProfileScreenProps } from "@/features/profile/EditProfileScreen"
import type { SetupAddScreenProps, SetupListScreenProps, SetupScreenProps, SupervisorsScreenProps } from "@/features/setup/SetupScreens"
import type { UploadsScreenProps } from "@/features/uploads/UploadsScreen"
import { cn } from "@/lib/utils"
import { ClassicButton, ClassicInput, ClassicMore, FormScreen } from "./ui"

/**
 * The Classic app's secondary screens: site setup lists, adding an item, supervisors, pending uploads and the
 * profile form. Same props as the step-by-step app's versions (one view-model each), Classic look.
 */

const Row = ({ title, sub, trailing, onPress }: { title: string; sub?: string; trailing?: React.ReactNode; onPress?: () => void }) => (
  <div
    role={onPress ? "button" : undefined}
    onClick={onPress}
    className={cn("flex min-h-[64px] items-center gap-3 border-b border-[#e3e3e3] py-2", onPress && "cursor-pointer")}
  >
    <div className="min-w-0 flex-1">
      <div className="text-[18px]">{title}</div>
      {sub && <div className="text-[15px] text-cl-muted">{sub}</div>}
    </div>
    {trailing}
  </div>
)

export function ClassicSetup({ t, categories, onBack }: SetupScreenProps) {
  return (
    <FormScreen title={t.siteSetting} onBack={onBack} backLabel={t.back}>
      <div className="-mt-2 flex flex-col">
        {categories.map((c) => (
          <Row key={c.key} title={c.name} sub={c.count} onPress={c.onOpen} trailing={<Icon name="chevron-right" size={22} className="text-cl-muted" />} />
        ))}
      </div>
    </FormScreen>
  )
}

export function ClassicSetupList(p: SetupListScreenProps) {
  const { t } = p
  return (
    <FormScreen title={p.name} onBack={p.onBack} backLabel={t.back} footer={<ClassicButton onPress={p.onAdd}>{p.addLabel}</ClassicButton>}>
      <div className="-mt-2 flex flex-col">
        {p.items.length === 0 && <p className="py-8 text-center text-[17px] text-cl-muted">{t.listEmpty}</p>}
        {p.items.map((it, i) => (
          <Row
            key={`${it.id}-${i}`}
            title={`${i + 1}. ${it.label}`}
            sub={[it.sub, it.pending ? t.pendingApproval : ""].filter(Boolean).join(" · ") || undefined}
            trailing={
              it.pending ? (
                <Icon name="hourglass" size={20} className="text-cl-amber" />
              ) : it.onRemove ? (
                <button type="button" onClick={it.onRemove} aria-label="Remove" className="flex size-11 cursor-pointer items-center justify-center text-cl-muted">
                  <Icon name="trash-2" size={20} />
                </button>
              ) : undefined
            }
          />
        ))}
      </div>
    </FormScreen>
  )
}

export function ClassicSetupAdd(p: SetupAddScreenProps) {
  const { t } = p
  return (
    <FormScreen title={p.title} onBack={p.onBack} backLabel={t.back} footer={<ClassicButton onPress={p.onSave}>{t.save}</ClassicButton>}>
      {p.fields.map((f) => (
        <ClassicInput key={f.key} label={f.label} value={f.value} onChange={f.onChange} type={f.type === "number" ? "number" : f.type === "tel" ? "tel" : "text"} suffix={f.unit || undefined} />
      ))}
    </FormScreen>
  )
}

export function ClassicSupervisors({ t, people, more, onBack }: SupervisorsScreenProps) {
  return (
    <FormScreen title={t.supervisorList} onBack={onBack} backLabel={t.back}>
      <div className="-mt-2 flex flex-col">
        {people.length === 0 && <p className="py-8 text-center text-[17px] text-cl-muted">{t.noData}</p>}
        {people.map((p, i) => (
          <Row
            key={`${p.name}-${i}`}
            title={p.name}
            sub={[p.role, p.phone].filter(Boolean).join(" · ")}
            trailing={
              <button type="button" onClick={p.onCall} aria-label={`Call ${p.name}`} className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-cl-soft text-cl">
                <Icon name="phone" size={20} />
              </button>
            }
          />
        ))}
      </div>
      <ClassicMore more={more} />
    </FormScreen>
  )
}

export function ClassicUploads(p: UploadsScreenProps) {
  const { t } = p
  return (
    <FormScreen title={t.pendingUploads} onBack={p.onBack} backLabel={t.back} footer={p.items.length ? <ClassicButton onPress={p.onSyncAll}>{t.syncNow}</ClassicButton> : undefined}>
      {p.offline && <div className="rounded-xl bg-cl-warn px-4 py-3 text-[15px]">{t.offlineToast}</div>}
      {p.items.length === 0 && <p className="py-8 text-center text-[17px] text-cl-muted">{t.uploadsEmpty}</p>}
      <div className="-mt-2 flex flex-col">
        {p.items.map((u) => (
          <div key={u.id} className="flex items-center gap-3 border-b border-[#e3e3e3] py-2.5">
            <div className="size-14 flex-none overflow-hidden rounded-lg bg-cl-soft">
              <MediaView item={u.media} thumb className="size-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[17px]">{u.name}</div>
              <div className={cn("text-[14px]", u.status === "failed" ? "text-cl-bad" : u.status === "uploading" ? "text-cl" : "text-cl-amber")}>{u.statusText}</div>
            </div>
            {u.status === "uploading" ? (
              <Icon name="loader-circle" size={22} className="animate-spin text-cl" />
            ) : (
              <button type="button" onClick={u.onRetry} className="cursor-pointer text-[16px] font-semibold text-cl">
                {t.retry}
              </button>
            )}
          </div>
        ))}
      </div>
    </FormScreen>
  )
}

export function ClassicEditProfile(p: EditProfileScreenProps) {
  const { t } = p
  return (
    <FormScreen title={t.editProfile} onBack={p.onBack} backLabel={t.back} footer={<ClassicButton onPress={p.onSave} disabled={!p.canSave}>{t.saveChanges}</ClassicButton>}>
      {p.fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-1">
          <ClassicInput label={f.label} value={f.value} onChange={f.onChange} type={f.type === "tel" ? "tel" : "text"} />
          {f.error && <span className="text-[14px] text-cl-bad">{f.error}</span>}
        </div>
      ))}
      {p.email && <ClassicInput label={t.loginEmail} value={p.email} onChange={() => {}} readOnly />}
      <p className="text-[14px] text-cl-muted">{t.managedByAdmin}</p>
    </FormScreen>
  )
}
