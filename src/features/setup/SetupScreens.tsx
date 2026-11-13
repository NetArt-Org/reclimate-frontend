"use client"

import {
  BackButton, FieldLabel, FieldNote, FieldShell, Icon, IconTile, ListRow, MediaView, PageTitle, Screen, ScreenWithFooter,
  type IconName, LoadMore, type MoreProps } from "@/components/common"
import { Button } from "@/components/ui/button"
import { CardList } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Dict } from "@/data/i18n"
import { cn } from "@/lib/utils"
import type { MediaItem } from "@/types"

/* ---------------- Category grid ---------------- */

export interface SetupScreenProps {
  t: Dict
  categories: { key: string; icon: IconName; name: string; count: string; onOpen: () => void }[]
  onBack: () => void
}

export function SetupScreen({ t, categories, onBack }: SetupScreenProps) {
  return (
    <Screen sub className="gap-3.5">
      <BackButton label={t.back} onClick={onBack} />
      <PageTitle size="md">{t.siteSetup}</PageTitle>
      <div className="grid grid-cols-2 gap-2.5">
        {categories.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={c.onOpen}
            className="flex min-h-[104px] cursor-pointer flex-col gap-2.5 rounded-[18px] border border-line bg-surface p-3.5 text-left active:scale-[.98]"
          >
            <IconTile icon={c.icon} tone="brand" size={40} iconSize={22} radius="rounded-xl" />
            <div>
              <div className="text-[15px] leading-[1.25] font-extrabold">{c.name}</div>
              <div className="mt-0.5 text-[13px] text-ink-muted">{c.count}</div>
            </div>
          </button>
        ))}
      </div>
    </Screen>
  )
}

/* ---------------- Items in a category ---------------- */

export interface SetupListScreenProps {
  t: Dict
  name: string
  icon: IconName
  /** `onRemove` is null where the list cannot be changed from the app (e.g. the biomass reference). */
  items: { id: string; label: string; sub: string; pending: boolean; onRemove: (() => void) | null }[]
  /** Text for the "add" button (adding a kiln or bulk density is a request to the admin). */
  addLabel: string
  onAdd: () => void
  onBack: () => void
}

export function SetupListScreen(p: SetupListScreenProps) {
  const { t } = p
  return (
    <Screen sub className="gap-3.5">
      <BackButton label={t.back} onClick={p.onBack} />
      <PageTitle size="md">{p.name}</PageTitle>
      <CardList>
        {p.items.map((it) => (
          <ListRow
            key={it.id}
            className="py-3.5"
            leading={<IconTile icon={p.icon} size={40} iconSize={20} radius="rounded-xl" />}
            title={<span className="text-base font-bold">{it.label}</span>}
            sub={
              it.sub || it.pending ? (
                <span className="text-sm">
                  {it.sub}
                  {it.pending && <span className="ml-1 font-bold text-warn">{(it.sub ? "· " : "") + t.pendingApproval}</span>}
                </span>
              ) : undefined
            }
            trailing={
              it.pending ? (
                <Icon name="hourglass" size={19} className="flex-none text-warn" />
              ) : !it.onRemove ? undefined : (
              <button
                type="button"
                onClick={it.onRemove}
                aria-label="Remove"
                className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-xl text-ink-subtle hover:bg-danger-soft hover:text-danger"
              >
                <Icon name="trash-2" size={19} />
              </button>
              )
            }
          />
        ))}
        {p.items.length === 0 && <div className="py-[22px] text-center text-[15px] text-ink-muted">{t.listEmpty}</div>}
      </CardList>
      <Button variant="dashed" size="md" className="h-[54px] text-base" onClick={p.onAdd}>
        <Icon name="plus" size={20} />
        {p.addLabel}
      </Button>
    </Screen>
  )
}

/* ---------------- Add form ---------------- */

/** One field of an "Add new" form (built by the view-model from data/constants SETUP_FORMS). */
export type AddField =
  | { kind: "input"; key: string; label: string; icon: IconName; type: "text" | "number" | "tel"; unit: string; value: string; onChange: (v: string) => void }
  | { kind: "select"; key: string; label: string; icon: IconName; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }
  | { kind: "photo"; key: string; label: string; icon: IconName; items: MediaItem[]; onAdd: () => void; onRemove: (id: string) => void }
  | { kind: "location"; key: string; label: string; icon: IconName; value: string | null; action: string; onCapture: () => void }
  | { kind: "note"; key: string; icon: IconName; text: string; ok: boolean }

export interface SetupAddScreenProps {
  t: Dict
  icon: IconName
  title: string
  fields: AddField[]
  fromWizard: boolean
  onSave: () => void
  onBack: () => void
}

function AddFieldView({ f, t }: { f: AddField; t: Dict }) {
  switch (f.kind) {
    case "input":
      return (
        <div className="flex flex-col gap-2">
          <FieldLabel>{f.label}</FieldLabel>
          <FieldShell icon={f.icon} unit={f.unit || undefined}>
            <Input aria-label={f.label} type={f.type} inputMode={f.type === "number" ? "decimal" : undefined} value={f.value} onChange={(e) => f.onChange(e.target.value)} />
          </FieldShell>
        </div>
      )
    case "select":
      return (
        <div className="flex flex-col gap-2">
          <FieldLabel>{f.label}</FieldLabel>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={f.label}>
            {f.options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={f.value === o.value}
                onClick={() => f.onChange(o.value)}
                className={cn(
                  "min-h-12 cursor-pointer rounded-2xl border-2 px-4 text-left text-[15px] font-bold active:scale-[.98]",
                  f.value === o.value ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )
    case "photo":
      return (
        <div className="flex flex-col gap-2">
          <FieldLabel>{f.label}</FieldLabel>
          <div className="flex flex-wrap gap-2.5">
            {f.items.map((m) => (
              <div key={m.id} className="relative size-24 overflow-hidden rounded-2xl bg-stripe-photo">
                <MediaView item={m} thumb className="size-full object-cover" />
                <button type="button" onClick={() => f.onRemove(m.id)} aria-label="Remove" className="absolute top-1.5 right-1.5 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white">
                  <Icon name="x" size={16} />
                </button>
              </div>
            ))}
            {f.items.length === 0 && (
              <button type="button" onClick={f.onAdd} className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand bg-brand-soft text-sm font-bold text-brand">
                <Icon name="camera" size={26} />
                {t.takePhotoBtn}
              </button>
            )}
          </div>
        </div>
      )
    case "location":
      return (
        <div className="flex flex-col gap-2">
          <FieldLabel>{f.label}</FieldLabel>
          <Button variant={f.value ? "soft" : "dashed"} size="md" className="h-[54px] justify-start gap-2.5 text-base" onClick={f.onCapture}>
            <Icon name={f.value ? "map-pin-check" : "locate-fixed"} size={20} />
            {f.value ?? f.action}
          </Button>
        </div>
      )
    case "note":
      return (
        <div className={cn("flex items-center gap-2 rounded-2xl px-4 py-3 text-[15px] font-bold", f.ok ? "bg-success-soft text-success-ink" : "bg-muted text-ink-muted")}>
          <Icon name={f.icon} size={18} />
          {f.text}
        </div>
      )
  }
}

export function SetupAddScreen(p: SetupAddScreenProps) {
  const { t } = p
  return (
    <ScreenWithFooter
      className="gap-4"
      footer={
        <Button variant="flat" size="xl" className="w-full gap-2.5" onClick={p.onSave}>
          <Icon name="check" size={22} />
          {t.saveBtn}
        </Button>
      }
    >
      <BackButton label={t.back} onClick={p.onBack} />
      <div className="flex items-center gap-3">
        <IconTile icon={p.icon} tone="brand" size={48} iconSize={24} />
        <PageTitle size="md">{p.title}</PageTitle>
      </div>
      {p.fields.map((f) => (
        <AddFieldView key={f.key} f={f} t={t} />
      ))}
      {p.fromWizard && (
        <FieldNote icon="corner-down-left">
          <span className="font-normal">{t.addReturn}</span>
        </FieldNote>
      )}
    </ScreenWithFooter>
  )
}

/* ---------------- Supervisors ---------------- */

export interface SupervisorsScreenProps {
  t: Dict
  people: { name: string; ini: string; role: string; phone: string; onCall: () => void }[]
  more?: MoreProps | null
  onBack: () => void
}

export function SupervisorsScreen({ t, people, more, onBack }: SupervisorsScreenProps) {
  return (
    <Screen sub className="gap-3.5">
      <BackButton label={t.back} onClick={onBack} />
      <PageTitle size="md">{t.supervisors}</PageTitle>
      {people.map((p, i) => (
        <div key={`${p.name}-${i}`} className="flex items-center gap-3 rounded-[18px] border border-line bg-surface p-3.5">
          <div className="flex size-12 flex-none items-center justify-center rounded-full bg-brand font-extrabold text-white">
            {p.ini}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-extrabold">{p.name}</div>
            <div className="text-sm text-ink-muted">
              {p.role} · {p.phone}
            </div>
          </div>
          <Button variant="soft" size="icon" onClick={p.onCall} aria-label={`Call ${p.name}`}>
            <Icon name="phone" size={20} />
          </Button>
        </div>
      ))}
      <LoadMore more={more} />
    </Screen>
  )
}
