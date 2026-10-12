import { DAYS } from "@/data/constants"
import { fieldProgress, limits, mediaOf, moistureOf } from "@/lib/batch"
import { L, fill, nameParts } from "@/lib/format"
import { currentPosition, videoSeconds } from "@/lib/native"
import type { Batch, FieldDef, MediaItem, MoistureReading } from "@/types"
import type { CelebrationState, StoreKit } from "./state"

const pad = (n: number) => String(n).padStart(2, "0")
const today = () => {
  const d = new Date()
  return { date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, short: pad(d.getDate()) + pad(d.getMonth() + 1) }
}
const batchSuffix = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("")
}
const coord = (n: number, positive: string, negative: string) => `${Math.abs(n).toFixed(4)}° ${n >= 0 ? positive : negative}`
const num = (v: unknown) => {
  const n = parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : 0
}

/** Batches: the step-by-step wizard, the Classic production cards, the camera and the supervisor's review. */
export function batchActions(k: StoreKit, onAvatar: (blob: Blob) => void) {
  const { get, set, t, toast, find, updateBatch, setVal, sync } = k

  const withMoistureRow = (b: Batch, i: number, patch: Partial<MoistureReading>) => {
    const rows = [...moistureOf(b)]
    const need = DAYS[1].steps.flatMap((s) => s.fields).find((f) => f.type === "moist")
    const readings = need?.type === "moist" ? need.readings : rows.length
    while (rows.length < Math.max(readings, i + 1)) rows.push({ val: "", ph: null })
    rows[i] = { ...rows[i], ...patch }
    b.v.moist = rows
    return b
  }

  const myName = () => {
    const s = get()
    return nameParts(s.profiles[s.user ?? "worker"].name).short
  }

  /** Estimated credits for litres of this batch's biochar (the backend's figure replaces it after the next sync). */
  const estimate = (b: Batch, litres: number) => {
    const f = get().feedstocks.find((x) => x.name === String(b.v.btype ?? b.bio ?? ""))
    return f?.creditsPerL ? litres * f.creditsPerL : (b.credits ?? 0)
  }

  const openWizard = (bid: string, day?: number, step?: number) => {
    const b = find(bid)
    if (!b) return
    if (b.day > 4 || b.status === "waiting") {
      set({ view: "batch", batchId: bid, sheet: null })
      return
    }
    set({ view: "wizard", wiz: { bid, day: day ?? b.day, step: step ?? b.step }, sheet: null, cel: null })
  }

  /** A new batch at the current site (with its id made on the phone, so it can be saved offline). */
  const createBatch = (init: Partial<Batch>) => {
    const s = get()
    if (s.me && !s.me.siteId) {
      set({ sheet: null })
      toast(t().noSite, "info")
      return null
    }
    const { date, short } = today()
    // Batch codes are unique across all sites and years: year + day + 8 random characters (no realistic clash).
    const id = `B-${String(new Date().getFullYear()).slice(2)}${short}-${batchSuffix()}`
    const b: Batch = {
      id, bio: "", kg: 0, kiln: "", date, status: "progress", day: 1, step: 0, litres: 0, v: {},
      workerName: s.profiles[s.user ?? "worker"].name, siteId: s.me?.siteId ?? null, ...init,
    }
    set((st) => ({ batches: [b, ...st.batches], dirty: [...st.dirty, id] }))
    sync.touch(id)
    return b
  }

  /** Validate a picked/recorded video against the network's minimum length. */
  const longEnough = async (blob: Blob) => {
    if (!blob.type.startsWith("video") || limits.minVideoSeconds <= 0) return true
    const secs = await videoSeconds(blob)
    // Unknown length (some recorders): accept rather than block the worker.
    if (secs != null && secs + 0.5 < limits.minVideoSeconds) {
      toast(fill(t().videoTooShort, { s: limits.minVideoSeconds }), "info")
      return false
    }
    return true
  }

  return {
    openWizard,
    newBatch: () => {
      const b = createBatch({})
      if (b) set({ sheet: null, view: "wizard", wiz: { bid: b.id, day: 1, step: 0 }, cel: null })
    },
    fixBatch: (bid: string) => {
      const b0 = find(bid)
      if (!b0) return
      const clr = b0.fixClear || "quench"
      const step = b0.fixStep ?? 0
      updateBatch(bid, (b) => {
        b.fixing = true
        if (clr === "moist") b.v.moist = []
        else if (clr === "litres" || clr.startsWith("temp")) {
          for (const key of Object.keys(b.v)) if (key === clr || (clr === "temp" && /^temp\d*$/.test(key))) b.v[key] = ""
        } else b.v[clr] = []
        return b
      })
      if (get().ui === "classic") return set({ cTab: "production", cSub: { ...get().cSub, production: "ongoing" } })
      set({ view: "wizard", wiz: { bid, day: 2, step } })
    },
    setVal,
    setMoisture: (bid: string, i: number, val: string) => updateBatch(bid, (b) => withMoistureRow(b, i, { val })),
    startBurn: (bid: string) => {
      setVal(bid, "burn", Date.now())
      toast(t().burnStarted, "flame")
    },
    captureLocation: (bid: string) => {
      void currentPosition()
        .then(({ lat, lng }) =>
          updateBatch(bid, (b) => {
            const label = `${coord(lat, "N", "S")}, ${coord(lng, "E", "W")}`
            b.v.loc = get().site ? `${label} · ${get().site}` : label
            b.v.lat = lat
            b.v.lng = lng
            return b
          })
        )
        .catch(() => toast(t().locFailed, "info"))
    },
    goToStep: (step: number) => set((s) => (s.wiz ? { wiz: { ...s.wiz, step } } : {})),
    exitWizard: () => {
      set({ view: null, wiz: null })
      toast(t().saved, "cloud-check")
    },
    completeStep: () => {
      const s = get()
      const w = s.wiz
      const tt = t()
      const b = w && find(w.bid)
      if (!w || !b) return
      const d = DAYS[w.day - 1]
      const st = d.steps[w.step]
      if (!st || st.fields.some((f) => !fieldProgress(f, b).done)) {
        toast(tt.notYet, "info")
        return
      }
      if (b.fixing) {
        updateBatch(b.id, (bb) => {
          bb.fixing = false
          bb.status = "waiting"
          bb.reason = null
          if (bb.v.litres) bb.litres = num(bb.v.litres) || bb.litres
          return bb
        })
        set({ view: null, wiz: null, cel: { kind: "res", bid: b.id, credits: estimate(b, b.litres) } })
        return
      }
      if (w.step < d.steps.length - 1) {
        const ns = w.step + 1
        updateBatch(b.id, (bb) => {
          if (bb.day === w.day) bb.step = Math.max(bb.step, ns)
          return bb
        })
        set({ wiz: { ...w, step: ns } })
        return
      }
      const v = b.v
      let cel: CelebrationState
      if (w.day === 1) {
        const kg = Math.round(num(v.qty) * (v.unit === "ton" ? 1000 : 1))
        const bio = String(v.btype ?? "")
        updateBatch(b.id, (bb) => ({ ...bb, kg, bio, day: 2, step: 0 }))
        cel = { kind: "d1", bid: b.id, kg, bio }
      } else if (w.day === 2) {
        const l = num(v.litres)
        updateBatch(b.id, (bb) => {
          bb.v.burnEnd = Date.now()
          return { ...bb, litres: l, kiln: String(v.kiln ?? ""), bio: bb.bio || String(v.btype ?? ""), status: "waiting", day: 3, step: 0 }
        })
        cel = { kind: "d2", bid: b.id, credits: estimate(b, l), l }
      } else if (w.day === 3) {
        updateBatch(b.id, (bb) => ({ ...bb, day: 4, step: 0 }))
        cel = { kind: "d3", bid: b.id, n: String(v.bags ?? 0) }
      } else {
        updateBatch(b.id, (bb) => ({ ...bb, day: 5, step: 0, status: "done" }))
        cel = { kind: "batch", bid: b.id, credits: b.credits ?? estimate(b, b.litres) }
      }
      set({ view: null, wiz: null, cel })
    },
    closeCelebration: () => {
      const kind = get().cel?.kind
      const flash = kind === "d2" || kind === "res"
      set({ cel: null, tab: "home", view: null, heroFlash: flash })
      if (flash) k.later(() => set({ heroFlash: false }), 2600)
    },

    /* ---------- Classic production cards ---------- */
    /** "Start Process": feedstock, kiln and moisture readings are on the form; the burn starts now. */
    startProcess: (data: { btype: string; kiln: string; moist: MoistureReading[] }, formId?: string) => {
      const fire = DAYS[1].steps.findIndex((st) => st.fields.some((f) => f.k === "firePh" || f.k === "fireVid"))
      const b = createBatch({ day: 2, step: Math.max(0, fire), kiln: data.kiln, bio: data.btype, v: { btype: data.btype, kiln: data.kiln, moist: data.moist, burn: Date.now() } })
      // Meter photos taken in the Classic form are still uploading for the form: hand them over to the batch, so
      // each lands in the batch's moisture rows (and is saved with it) when its upload finishes.
      if (b && formId) set((s) => ({ uploads: s.uploads.map((u) => (u.rid === formId ? { ...u, rid: undefined, bid: b.id } : u)) }))
      if (b) toast(t().burnStarted, "flame")
      return b
    },
    openBatchSheet: (sheet: "temp" | "endBurn" | "qty" | "moisture", bid: string) => {
      const b = find(bid)
      if (!b) return
      const values: Record<string, string> =
        sheet === "qty" ? { qty: String(b.v.qty ?? (b.kg || "")) } : sheet === "endBurn" ? { litres: String(b.v.litres ?? ""), measure: String(b.v.measure ?? ""), sample: String(b.v.sample ?? "") } : {}
      if (sheet === "temp") Object.keys(b.v).filter((x) => /^temp\d*$/.test(x)).forEach((x) => (values[x] = String(b.v[x] ?? "")))
      set({ sheet, sheetBatch: bid, sheetValues: values })
    },
    setSheetValue: (key: string, value: string) => set((s) => ({ sheetValues: { ...s.sheetValues, [key]: value } })),
    saveSheet: () => {
      const s = get()
      const b = find(s.sheetBatch)
      if (!b) return set({ sheet: null })
      const vals = s.sheetValues
      const tt = t()
      if (s.sheet === "temp") {
        const fields = DAYS[1].steps.flatMap((st) => st.fields).filter((f) => f.type === "number" && /^temp\d*$/.test(f.k))
        const bad = fields.find((f) => f.type === "number" && (num(vals[f.k]) <= 0 || (f.min != null && num(vals[f.k]) < f.min)))
        if (bad && bad.type === "number") return toast(bad.min ? fill(tt.tempMin, { n: bad.min }) : tt.notYet, "info")
        updateBatch(b.id, (bb) => {
          fields.forEach((f) => (bb.v[f.k] = vals[f.k]))
          return bb
        })
      } else if (s.sheet === "qty") {
        if (num(vals.qty) <= 0) return toast(tt.notYet, "info")
        updateBatch(b.id, (bb) => ({ ...bb, kg: Math.round(num(vals.qty)), v: { ...bb.v, qty: vals.qty, unit: "kg" } }))
      } else if (s.sheet === "endBurn") {
        // Every capture the network asks for must be done before the burn can end.
        const missing = DAYS[1].steps.flatMap((st) => st.fields).filter((f) => f.k !== "litres" && f.k !== "measure" && f.k !== "sample" && !fieldProgress(f, b).done)
        if (missing.length) return toast(`${tt.stillNeeded}: ${missing.map((f) => L(f.label, s.lang).toLowerCase()).join(", ")}`, "info")
        const l = num(vals.litres)
        if (l <= 0) return toast(tt.notYet, "info")
        updateBatch(b.id, (bb) => ({
          ...bb, litres: l, status: "waiting", day: 3, step: 0, fixing: false, reason: null,
          v: { ...bb.v, litres: String(l), measure: vals.measure || bb.v.measure, sample: vals.sample || bb.v.sample, burnEnd: Date.now() },
        }))
        toast(fill(tt.burnEnded, { l }), "flame")
      }
      set({ sheet: null, sheetBatch: null, sheetValues: {} })
    },

    /* ---------- camera ---------- */
    openCamera: (bid: string, f: FieldDef, slot?: number) => {
      if (f.type === "moist" && slot != null) {
        set({ cam: { bid, k: f.k, kind: "photo", need: 1, slot, tip: f.tip, label: { en: `Moisture ${slot + 1}`, id: `Kelembapan ${slot + 1}` } } })
      } else if (f.type === "media") {
        set({ cam: { bid, k: f.k, kind: f.kind, need: f.need, label: f.label, tip: f.tip, minSeconds: f.kind === "video" ? limits.minVideoSeconds : undefined } })
      }
    },
    closeCamera: () => set({ cam: null }),
    /** A photo or video came back from the camera. */
    capture: async (blob: Blob) => {
      const s = get()
      const c = s.cam
      if (!c) return
      const tt = t()
      if (c.avatar) return onAvatar(blob)
      if (!(await longEnough(blob))) return
      const offline = !s.online
      // Into a Classic form (the record is sent with its files once they are uploaded).
      if (c.rid && c.k) {
        const form = get().recordForm
        if (!form || form.id !== c.rid) return set({ cam: null })
        const item = k.keepFile(blob, { kind: c.kind, rid: c.rid, name: { en: L(c.label, "en"), id: L(c.label, "id") } })
        if (c.slot != null) {
          const rows = [...((form.data.moist as unknown as MoistureReading[]) ?? [])]
          rows[c.slot] = { ...(rows[c.slot] ?? { val: "" }), ph: item }
          set({ recordForm: { ...form, data: { ...form.data, moist: rows as unknown as MediaItem[] } }, cam: null })
          return
        }
        const list = [...((form.data[c.k] as MediaItem[]) ?? []), item]
        set({ recordForm: { ...form, data: { ...form.data, [c.k]: list } } })
        if (list.length >= c.need) set({ cam: null })
        return
      }
      if (!c.bid || !c.k) return
      const bid = c.bid
      const key = c.k
      const item = k.keepFile(blob, { kind: c.kind, bid, name: { en: L(c.label, "en"), id: L(c.label, "id") } })
      if (c.slot != null) {
        const slot = c.slot
        updateBatch(bid, (b) => withMoistureRow(b, slot, { ph: item }))
        set({ cam: null })
        toast(offline ? tt.savedOffline : tt.photoSaved, offline ? "cloud-off" : "camera")
        return
      }
      const have = mediaOf(find(bid) ?? ({ v: {} } as Batch), key).length + 1
      updateBatch(bid, (bb) => {
        bb.v[key] = [...mediaOf(bb, key), item]
        return bb
      })
      if (have >= c.need) {
        set({ cam: null })
        toast(fill(tt.allTaken, { x: L(c.label, s.lang).toLowerCase() }), "party-popper")
      } else if (offline) toast(tt.savedOffline, "cloud-off")
    },

    /* ---------- supervisor review ---------- */
    openReview: (bid: string) => set({ view: "sreview", reviewId: bid }),
    acceptReview: (bid?: string) => {
      const b = find(bid ?? get().reviewId)
      if (!b) return
      updateBatch(b.id, (bb) => ({ ...bb, status: bb.day > 4 ? "done" : "approved", by: myName(), reason: null, rejectKey: null, rejectNote: "", reviewing: true }))
      set({ view: null })
      const w = nameParts(b.workerName ?? "").short
      toast(fill(t().acceptedToast, { c: (b.credits ?? estimate(b, b.litres)).toFixed(2), w }), "badge-check")
    },
    openReject: (bid?: string) => set((s) => ({ sheet: "reject", rejectReason: null, rejectNote: "", reviewId: bid ?? s.reviewId })),
    pickRejectReason: (key: string) => set({ rejectReason: key }),
    setRejectNote: (rejectNote: string) => set({ rejectNote }),
    confirmReject: () => {
      const s = get()
      const r = s.rejectReasons.find((x) => x.key === s.rejectReason)
      const b = find(s.reviewId)
      if (!r || !b) return toast(t().rejectTitle, "info")
      const note = s.rejectNote.trim()
      updateBatch(b.id, (bb) => ({
        ...bb, status: "rejected", by: myName(), reason: [r.label, note].filter(Boolean).join(" · "),
        fixClear: r.redo, rejectKey: r.key, rejectNote: note, reviewing: true,
      }))
      set({ sheet: null, view: null })
      toast(fill(t().rejectedToast, { w: nameParts(b.workerName ?? "").short }), "circle-x")
    },
  }
}
