import { rid } from "@/data/constants"
import { pageState, type BatchList } from "@/data/app-data"
import * as api from "@/lib/api"
import { isWet } from "@/lib/batch"
import { fill } from "@/lib/format"
import { mediaStore } from "@/lib/media-store"
import { currentPosition } from "@/lib/native"
import type { Localized, MediaItem, MoistureReading, PendingRecord } from "@/types"
import type { ClassicSub, ClassicTab, RecordForm, StoreKit } from "./state"

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : 0
}
const media = (v: unknown) => (Array.isArray(v) ? (v as MediaItem[]) : [])

/** The Classic app: tabs, its add-record forms, and loading further pages of every list. */
export function recordActions(k: StoreKit, startProcess: (d: { btype: string; kiln: string; moist: MoistureReading[] }, formId?: string) => unknown) {
  const { get, set, t, toast, sync } = k

  const form = () => get().recordForm
  const patchForm = (data: RecordForm["data"]) => set((s) => (s.recordForm ? { recordForm: { ...s.recordForm, data: { ...s.recordForm.data, ...data } } } : {}))

  /** Drop a form's captured files that were never sent. */
  const discardFiles = (id: string) => {
    get().uploads.filter((u) => u.rid === id).forEach((u) => mediaStore.remove(u.id))
    set((s) => ({ uploads: s.uploads.filter((u) => u.rid !== id) }))
  }

  /** What is still missing on a Classic form (the backend checks again when it is sent). */
  function missing(f: RecordForm): string | null {
    const s = get()
    const tt = t()
    const r = s.rules
    const d = f.data
    const photos = media(d.photos).length
    const need = (n: number) => (photos < n ? fill(tt.needPhotos, { n }) : null)
    switch (f.kind) {
      case "collections":
        if (!d.source) return tt.pickSource
        if (!d.feedstock) return tt.pickBiomass
        if (num(d.qty) <= 0) return tt.enterQty
        if (d.transport === "Vehicle" && !d.vehicle) return tt.pickVehicle
        return need(r?.photos.biomass ?? 0)
      case "mixings":
        if (!d.mixType) return tt.pickMix
        if (num(d.biocharL) <= 0) return tt.enterQty
        if (s.stats && num(d.biocharL) > s.stats.available.biocharL) return fill(tt.overAvailable, { n: Math.floor(s.stats.available.biocharL) })
        return need(r?.photos.mixing ?? 0)
      case "packagings":
        if (!d.packagingType) return tt.pickPackaging
        if (!d.bag) return tt.pickBag
        if (num(d.bags) <= 0) return tt.enterBags
        return need(r?.photos.packing ?? 0)
      case "applications":
        if (!d.recipient) return tt.pickReceiver
        if (!d.mixType) return tt.pickProduct
        if (num(d.quantity) <= 0 && num(d.bags) <= 0) return tt.enterQty
        return need(r?.photos.application ?? 0)
      case "start": {
        if (!d.btype) return tt.pickBiomass
        if (!d.kiln) return tt.pickKiln
        if (r?.moisture.required) {
          const rows = (d.moist as unknown as MoistureReading[]) ?? []
          const done = Array.from({ length: r.moisture.readings }, (_, i) => rows[i]).filter((x) => x && x.val !== "" && x.ph).length
          if (done < r.moisture.readings) return fill(tt.needMoisture, { n: r.moisture.readings })
          if (rows.some((x) => x && isWet(x.val))) return fill(tt.tooWetShort, { m: r.moisture.max })
        }
        return null
      }
    }
  }

  /** Fetch the next page of a list and merge it in. */
  async function loadMore(list: BatchList | api.RecordKind | "history" | "supervisors") {
    const s = get()
    if (s.loadingMore[list] || !s.online || !s.me) return
    set((st) => ({ loadingMore: { ...st.loadingMore, [list]: true } }))
    try {
      if (list === "history") {
        const p = await api.historyPage(s.historyPage.page + 1)
        set((st) => ({ history: [...st.history, ...p.items], historyPage: pageState(p) }))
      } else if (list === "supervisors") {
        const p = await api.supervisorPage(s.supervisorsPage.page + 1)
        set((st) => ({ supervisors: api.mergeById(st.supervisors as { id: string }[], p.items.map(api.supervisorFromServer) as { id: string }[]) as typeof st.supervisors, supervisorsPage: pageState(p) }))
      } else if (list === "collections" || list === "mixings" || list === "packagings" || list === "applications") {
        const p = await api.recordPage(list, s.recordPages[list].page + 1)
        set((st) => ({
          records: { ...st.records, [list]: api.mergeById(st.records[list] as { id: string }[], p.items as { id: string }[]) },
          recordPages: { ...st.recordPages, [list]: pageState(p) },
        }))
      } else {
        const cur = s.batchPages[list]
        const p = await api.batchPage(cur.page + 1, list === "all" ? undefined : list)
        const reasons = get().rejectReasons
        const keep = (b: { id: string; fixing?: boolean }) => get().dirty.includes(b.id) || !!b.fixing
        set((st) => ({
          batches: api.sortBatches(api.mergeById(st.batches, p.items.map((d) => api.batchFromServer(d, reasons, st.me?.siteId)), keep)),
          batchPages: { ...st.batchPages, [list]: pageState(p) },
        }))
      }
    } catch (e) {
      toast(api.errorMessage(e, t().loadFailed, t().noNet), e instanceof api.NetworkError ? "wifi-off" : "triangle-alert")
    } finally {
      set((st) => ({ loadingMore: { ...st.loadingMore, [list]: false } }))
    }
  }

  return {
    loadMore,

    /* ---------- Classic navigation ---------- */
    cSetTab: (cTab: ClassicTab) => set({ cTab, view: null, drawer: false }),
    cSetSub: <K extends keyof ClassicSub>(key: K, value: ClassicSub[K]) => set((s) => ({ cSub: { ...s.cSub, [key]: value } })),
    cSetKiln: (cKiln: string | null) => set({ cKiln }),
    toggleDrawer: (open?: boolean) => set((s) => ({ drawer: open ?? !s.drawer })),
    openClassicView: (view: "settings" | "uploads" | "setup" | "sups") => set({ view, drawer: false }),

    /* ---------- Classic forms ---------- */
    openRecordForm: (kind: RecordForm["kind"], preset: RecordForm["data"] = {}) => {
      const s = get()
      if (s.me && !s.me.siteId) return toast(t().noSite, "info")
      if (kind === "mixings" && s.rules?.hideMixingTab) return toast(t().mixingOff, "info")
      const defaults: RecordForm["data"] =
        kind === "collections" ? { transport: "Manual", unit: "kg" } : kind === "applications" ? { kind: s.cSub.distribution, mode: "Manual", unit: "kg" } : {}
      set({ recordForm: { id: rid(), kind, data: { ...defaults, ...preset } }, view: kind === "collections" && !preset.source ? "sourcePick" : "recordForm", drawer: false })
    },
    pickSource: (name: string) => {
      patchForm({ source: name })
      set({ view: "recordForm" })
    },
    setFormField: (key: string, value: string) => patchForm({ [key]: value }),
    setFormMoisture: (i: number, val: string) => {
      const f = form()
      if (!f) return
      const rows = [...((f.data.moist as unknown as MoistureReading[]) ?? [])]
      rows[i] = { ...(rows[i] ?? { ph: null }), val }
      patchForm({ moist: rows as unknown as MediaItem[] })
    },
    /** Take photos/videos for the open form (`key` is "photos" or "videos"; `slot` a moisture row). */
    formCamera: (key: string, kind: "photo" | "video", need: number, label: Localized, slot?: number) => {
      const f = form()
      if (!f) return
      set({
        cam: {
          rid: f.id, k: key, kind, need: Math.max(1, need), slot, label,
          tip: kind === "video" ? { en: "Hold the phone still", id: "Pegang HP dengan tenang" } : { en: "Whole subject in view, good light", id: "Seluruh objek terlihat, cahaya terang" },
          minSeconds: undefined,
        },
      })
    },
    removeFormMedia: (key: string, id: string) => {
      const f = form()
      if (!f) return
      mediaStore.remove(id)
      set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) }))
      patchForm({ [key]: media(f.data[key]).filter((m) => m.id !== id) })
    },
    formLocation: () => {
      void currentPosition()
        .then(({ lat, lng }) => patchForm({ lat, lng, address: form()?.data.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}` }))
        .catch(() => toast(t().locFailed, "info"))
    },
    submitRecordForm: () => {
      const f = form()
      if (!f) return
      const problem = missing(f)
      if (problem) return toast(problem, "info")
      if (f.kind === "start") {
        const d = f.data
        startProcess({ btype: String(d.btype), kiln: String(d.kiln), moist: ((d.moist as unknown as MoistureReading[]) ?? []).filter(Boolean) }, f.id)
        set({ recordForm: null, view: null, cTab: "production", cSub: { ...get().cSub, production: "ongoing" } })
        return
      }
      const rec: PendingRecord = { id: f.id, kind: f.kind, siteId: get().me?.siteId ?? null, data: f.data, at: new Date().toISOString() }
      set((s) => ({ pendingRecords: [rec, ...s.pendingRecords], recordForm: null, view: null }))
      sync.schedule(0)
      toast(get().online ? t().saved : t().savedOffline, get().online ? "cloud-check" : "cloud-off")
      // The site totals change with the new record: refresh them once it has been sent.
      void sync.flush().then(() => sync.pull())
    },
    cancelRecordForm: () => {
      const f = form()
      if (f && !get().pendingRecords.some((r) => r.id === f.id)) discardFiles(f.id)
      set({ recordForm: null, view: null })
    },
    /** A record the backend refused: try again (after the worker fixed the cause elsewhere), or discard it. */
    retryRecord: (id: string) => {
      set((s) => ({ pendingRecords: s.pendingRecords.map((r) => (r.id === id ? { ...r, error: undefined } : r)) }))
      sync.schedule(0)
    },
    discardRecord: (id: string) => {
      discardFiles(id)
      set((s) => ({ pendingRecords: s.pendingRecords.filter((r) => r.id !== id) }))
    },
  }
}
