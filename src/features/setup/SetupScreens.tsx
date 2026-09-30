"use client"

import {
  BackButton, FieldLabel, FieldNote, FieldShell, Icon, IconTile, ListRow, PageTitle, Screen, ScreenWithFooter,
  type IconName,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { CardList } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Dict } from "@/data/i18n"

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
  items: { id: string; label: string; sub: string; onRemove: () => void }[]
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
            sub={it.sub ? <span className="text-sm">{it.sub}</span> : undefined}
            trailing={
              <button
                type="button"
                onClick={it.onRemove}
                aria-label="Remove"
                className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-xl text-ink-subtle hover:bg-danger-soft hover:text-danger"
              >
                <Icon name="trash-2" size={19} />
              </button>
            }
          />
        ))}
        {p.items.length === 0 && <div className="py-[22px] text-center text-[15px] text-ink-muted">{t.listEmpty}</div>}
      </CardList>
      <Button variant="dashed" size="md" className="h-[54px] text-base" onClick={p.onAdd}>
        <Icon name="plus" size={20} />
        {t.addNew}
      </Button>
    </Screen>
  )
}

/* ---------------- Add form ---------------- */

export interface SetupAddScreenProps {
  t: Dict
  icon: IconName
  title: string
  fields: { key: string; label: string; icon: IconName; type: string; unit: string; value: string; onChange: (v: string) => void }[]
  fromWizard: boolean
  onSave: () => void
  onBack: () => void
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
        <div key={f.key} className="flex flex-col gap-2">
          <FieldLabel>{f.label}</FieldLabel>
          <FieldShell icon={f.icon} unit={f.unit || undefined}>
            <Input
              type={f.type}
              inputMode={f.type === "number" ? "decimal" : undefined}
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
            />
          </FieldShell>
        </div>
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
  onBack: () => void
}

export function SupervisorsScreen({ t, people, onBack }: SupervisorsScreenProps) {
  return (
    <Screen sub className="gap-3.5">
      <BackButton label={t.back} onClick={onBack} />
      <PageTitle size="md">{t.supervisors}</PageTitle>
      {people.map((p) => (
        <div key={p.name} className="flex items-center gap-3 rounded-[18px] border border-line bg-surface p-3.5">
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
    </Screen>
  )
}
