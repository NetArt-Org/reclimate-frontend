"use client"

import { useState } from "react"
import { Icon, MediaView } from "@/components/common"
import type { Dict } from "@/data/i18n"
import { cn } from "@/lib/utils"
import type { MediaItem } from "@/types"
import { ClassicButton, ClassicInput, ClassicSelect, ClassicSheet, FormScreen, MediaAdd, Toggle2 } from "./ui"

/**
 * One field of a Classic form. The forms (Add Biomass, Start Process, Add Mixing/Packaging/Application/
 * Distribution) are described as a list of these by the view-model, so a form's content changes in one place.
 */
export type FormField = InputField | SelectField | OtherField

export interface InputField {
      type: "text" | "number" | "tel"
      key: string
      label: string
      value: string
      suffix?: string
      readOnly?: boolean
      multiline?: boolean
      onChange: (v: string) => void
      /** A unit picker next to the value (kg / ton). */
      units?: { value: string; options: string[]; onChange: (v: string) => void }
}

export interface SelectField {
  type: "select"
  key: string
  label: string
  value: string
  options: { value: string; label: string; disabled?: boolean }[]
  onChange: (v: string) => void
  side?: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }
}

type OtherField =
  | { type: "toggle"; key: string; label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }
  | { type: "media"; key: string; label: string; kind: "photo" | "video"; required: boolean; items: MediaItem[]; onAdd: () => void; onRemove: (id: string) => void }
  | { type: "moist"; key: string; label: string; rows: { value: string; wet: boolean; photo: MediaItem | null; onChange: (v: string) => void; onPhoto: () => void }[]; warn: string | null }
  | { type: "location"; key: string; label: string; value: string; onCapture: () => void }
  | { type: "note"; key: string; text: string }

export interface ClassicFormProps {
  t: Dict
  title: string
  fields: FormField[]
  submitLabel: string
  onSubmit: () => void
  onBack: () => void
}

export function ClassicForm({ t, title, fields, submitLabel, onSubmit, onBack }: ClassicFormProps) {
  return (
    <FormScreen title={title} onBack={onBack} backLabel={t.back} footer={<ClassicButton onPress={onSubmit}>{submitLabel}</ClassicButton>}>
      {fields.map((f) => {
        switch (f.type) {
          case "text":
          case "number":
          case "tel":
            return f.units ? (
              <div key={f.key} className="grid grid-cols-[1fr_8rem] gap-3">
                <ClassicInput label={f.label} value={f.value} onChange={f.onChange} type={f.type} />
                <ClassicSelect label={f.units.value || f.units.options[0]} value={f.units.value} options={f.units.options.map((u) => ({ value: u, label: u }))} onChange={f.units.onChange} />
              </div>
            ) : (
              <ClassicInput key={f.key} label={f.label} value={f.value} onChange={f.onChange} type={f.type} suffix={f.suffix} readOnly={f.readOnly} multiline={f.multiline} />
            )
          case "select":
            return f.side ? (
              <div key={f.key} className="grid grid-cols-[1fr_auto] gap-3">
                <ClassicSelect label={f.label} value={f.value} options={f.options} onChange={f.onChange} />
                <ClassicSelect label={f.side.label} value={f.side.value} options={f.side.options} onChange={f.side.onChange} className="w-32" />
              </div>
            ) : (
              <ClassicSelect key={f.key} label={f.label} value={f.value} options={f.options} onChange={f.onChange} />
            )
          case "toggle":
            return (
              <div key={f.key} className="flex flex-col gap-3">
                <div className="text-[18px] font-semibold">{f.label}</div>
                <Toggle2 value={f.value} options={f.options} onChange={f.onChange} />
              </div>
            )
          case "media":
            return <MediaAdd key={f.key} label={f.label} kind={f.kind} required={f.required} items={f.items} onAdd={f.onAdd} onRemove={f.onRemove} />
          case "moist":
            return (
              <div key={f.key} className="flex flex-col gap-4">
                <div className="text-[17px] font-medium">{f.label}</div>
                {f.rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 text-[18px] text-cl">{i + 1})</span>
                    <label className={cn("flex h-[64px] min-w-0 flex-1 items-center rounded-xl border px-4", r.wet ? "border-cl-bad" : "border-[#c9c9c9]")}>
                      <input
                        inputMode="decimal"
                        value={r.value}
                        onChange={(e) => r.onChange(e.target.value.replace(/[^\d.]/g, ""))}
                        aria-label={`${f.label} ${i + 1}`}
                        className="min-w-0 flex-1 bg-transparent text-[18px] outline-none"
                      />
                      <span className="text-[17px] font-medium">%</span>
                    </label>
                    <button type="button" onClick={r.onPhoto} aria-label={`${f.label} ${i + 1} photo`} className="flex size-[64px] flex-none cursor-pointer items-center justify-center overflow-hidden rounded-md bg-cl-tile text-cl">
                      {r.photo ? <MediaView item={r.photo} thumb className="size-full object-cover" /> : <Icon name="image-check" size={26} />}
                    </button>
                  </div>
                ))}
                {f.warn && <p className="text-[15px] text-cl-bad">{f.warn}</p>}
              </div>
            )
          case "location":
            return (
              <button key={f.key} type="button" onClick={f.onCapture} className="flex min-h-[64px] cursor-pointer items-center gap-3 rounded-xl border border-[#c9c9c9] px-5 text-left text-[17px]">
                <Icon name="locate-fixed" size={22} className="text-cl" />
                <span className={cn("flex-1", !f.value && "text-cl-muted")}>{f.value || f.label}</span>
              </button>
            )
          case "note":
            return (
              <p key={f.key} className="-mt-3 text-[16px] font-semibold">
                {f.text}
              </p>
            )
        }
      })}
    </FormScreen>
  )
}

/* ---------------- Add Biomass: pick the source ---------------- */

export interface SourcePickProps {
  t: Dict
  sources: { name: string; sub: string }[]
  farmers: { name: string; sub: string }[]
  onPick: (name: string) => void
  onAddNew: () => void
  onBack: () => void
}

export function SourcePick({ t, sources, farmers, onPick, onAddNew, onBack }: SourcePickProps) {
  const [q, setQ] = useState("")
  const match = (x: { name: string; sub: string }) => !q || `${x.name} ${x.sub}`.toLowerCase().includes(q.toLowerCase())
  return (
    <FormScreen title={t.addBiomass} onBack={onBack} backLabel={t.back}>
      <label className="flex h-[58px] items-center gap-3 rounded-full border border-cl-ink px-5">
        <Icon name="search" size={22} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchSource} aria-label={t.searchSource} className="min-w-0 flex-1 bg-transparent text-[17px] outline-none" />
      </label>
      <button type="button" onClick={onAddNew} className="-mt-1 flex cursor-pointer items-center gap-2 self-end text-[19px] text-cl">
        <Icon name="circle-plus" size={24} /> {t.addNewSource}
      </button>
      <div className="text-[18px] font-semibold">{t.sourceList}</div>
      <div className="-mt-3 flex flex-col">
        {sources.filter(match).map((s, i) => (
          <button key={`${s.name}-${i}`} type="button" onClick={() => onPick(s.name)} className="cursor-pointer border-b border-[#e3e3e3] py-3.5 text-left text-[18px]">
            {i + 1}. {s.name}
          </button>
        ))}
      </div>
      <div className="text-[18px] font-semibold">{t.farmersList}</div>
      <div className="-mt-3 flex flex-col">
        {farmers.filter(match).map((f, i) => (
          <button key={`${f.name}-${i}`} type="button" onClick={() => onPick(f.name)} className="flex cursor-pointer items-center gap-3 border-b border-[#e3e3e3] py-3 text-left">
            <Icon name="circle-user-round" size={30} />
            <span>
              <span className="block text-[18px]">{f.name}</span>
              {f.sub && <span className="block text-[16px] text-cl-muted">({f.sub})</span>}
            </span>
          </button>
        ))}
      </div>
    </FormScreen>
  )
}

/* ---------------- Sheets ---------------- */

export interface ClassicSheetsProps {
  t: Dict
  /** View the moisture readings of a batch. */
  moisture: { open: boolean; title: string; time: string; rows: { value: string; wet: boolean; photo: MediaItem | null }[]; onClose: () => void }
  /** Type values for a batch: temperature readings, end of process, biomass quantity. */
  entry: {
    open: boolean
    title: string
    note: string | null
    fields: FormField[]
    onSave: () => void
    onClose: () => void
  }
  language: { open: boolean; value: string; options: { value: string; label: string }[]; onPick: (v: string) => void; onClose: () => void }
}

export function ClassicSheets({ t, moisture, entry, language }: ClassicSheetsProps) {
  return (
    <>
      <ClassicSheet open={moisture.open} title={moisture.title} onClose={moisture.onClose}>
        {moisture.time && <div className="text-right text-[15px] font-semibold">{moisture.time}</div>}
        {moisture.rows.length === 0 && <div className="py-4 text-center text-cl-muted">{t.noData}</div>}
        {moisture.rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-1">
            <span className={cn("text-[17px]", r.wet && "font-semibold text-cl-bad")}>{t.moistureVal.replace("{v}", r.value || "—")}</span>
            <span className="size-20 overflow-hidden rounded-md bg-cl-soft">{r.photo && <MediaView item={r.photo} thumb className="size-full object-cover" />}</span>
          </div>
        ))}
      </ClassicSheet>

      <ClassicSheet open={entry.open} title={entry.title} onClose={entry.onClose}>
        {entry.note && <p className="text-[15px] text-cl-muted">{entry.note}</p>}
        <div className="flex flex-col gap-4">
          {entry.fields.map((f) =>
            f.type === "select" ? (
              <ClassicSelect key={f.key} label={f.label} value={f.value} options={f.options} onChange={f.onChange} />
            ) : f.type === "text" || f.type === "number" || f.type === "tel" ? (
              <ClassicInput key={f.key} label={f.label} value={f.value} onChange={f.onChange} type={f.type} suffix={f.suffix} />
            ) : null
          )}
        </div>
        <ClassicButton onPress={entry.onSave} className="mt-2">
          {t.save}
        </ClassicButton>
      </ClassicSheet>

      <ClassicSheet open={language.open} title={t.languageL} onClose={language.onClose}>
        {language.options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => language.onPick(o.value)}
            className={cn("flex h-14 cursor-pointer items-center justify-between rounded-xl border px-4 text-[18px]", o.value === language.value ? "border-cl bg-cl-soft" : "border-[#ddd]")}
          >
            {o.label}
            {o.value === language.value && <Icon name="check" size={22} className="text-cl" />}
          </button>
        ))}
      </ClassicSheet>
    </>
  )
}
