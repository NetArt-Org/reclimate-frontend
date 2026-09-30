"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import type { IconName } from "@/components/common/Icon"
import { createEmptyData, type AppData } from "@/data/app-data"
import { CREDIT_FACTOR, DAYS, REJECT_REASONS, SETUP_FORMS, rid } from "@/data/constants"
import { translations, type Dict } from "@/data/i18n"
import * as api from "@/lib/api"
import { fieldProgress, mediaOf, moistureOf } from "@/lib/batch"
import { L, fill, nameParts } from "@/lib/format"
import { fileToJpeg } from "@/lib/image"
import { mediaStore } from "@/lib/media-store"
import type {
  Batch, FieldDef, Lang, Localized, MediaItem, MoistureReading, OutboxOp, Profile, Role, UploadItem,
} from "@/types"
import { createSync } from "./sync"

/** Cached copy of the signed-in user's data. Never holds the session token (see lib/api/client). */
const STORAGE_KEY = "reclimate-dmrv-v2"

/** Optional, demo only: numbers pre-filled on the login screen. */
const DEMO_PHONE: Record<Role, string> = {
  worker: process.env.NEXT_PUBLIC_DEMO_WORKER_PHONE ?? "",
  sup: process.env.NEXT_PUBLIC_DEMO_SUPERVISOR_PHONE ?? "",
}

export const PIN_LENGTH = 4

export type Tab = "home" | "process" | "credits" | "profile" | "review" | "history"
export type View =
  | "batch" | "wizard" | "uploads" | "setup" | "setupList" | "setupAdd" | "sups" | "editProfile" | "sreview"
export type SheetKind = "start" | "site" | "sell" | "logout" | "photo" | "reject"

export interface WizardPos { bid: string; day: number; step: number }

export interface CameraState {
  bid?: string
  k?: string
  kind: "photo" | "video"
  need: number
  /** Moisture row index when capturing a meter photo. */
  slot?: number
  label: Localized
  tip: Localized
  avatar?: boolean
}

export type CelebrationKind = "d1" | "d2" | "d3" | "batch" | "res"
export interface CelebrationState {
  kind: CelebrationKind
  bid: string
  kg?: number
  bio?: string
  credits?: number
  l?: number
  n?: string | number
}

export interface AddFormState {
  key: string
  vals: Record<string, string>
  /** When opened from the wizard: where to write the new item back. */
  ret: { bid: string; k: string } | null
}

export interface ToastState { msg: string; icon: IconName; k: number }

export interface AppState extends AppData {
  /** Saved data has been restored from localStorage (client only). */
  hydrated: boolean
  /** Still checking with the backend whether this phone is signed in. */
  booting: boolean
  lang: Lang
  user: Role | null
  loginRole: Role
  loginPhone: string
  loginPin: string
  loginError: string | null
  loginBusy: boolean
  accountType: "existing" | "new"
  tab: Tab
  view: View | null
  sheet: SheetKind | null
  online: boolean
  slow: boolean
  loading: boolean
  now: number
  draft: Profile | null
  addForm: AddFormState | null
  setupIdx: number
  batchId: string | null
  reviewId: string | null
  rejectReason: string | null
  rejectNote: string
  wiz: WizardPos | null
  cam: CameraState | null
  cel: CelebrationState | null
  sellStep: "form" | "done"
  toast: ToastState | null
  savedAt: number
  heroFlash: boolean
}

export interface StoreOptions {
  initialLang?: Lang
}

type Persisted = Partial<AppData & { lang: Lang }>

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const saved: Persisted | null = raw ? JSON.parse(raw) : null
    // An upload interrupted by closing the app starts again.
    if (saved?.uploads) saved.uploads = saved.uploads.map((u) => (u.status === "uploading" ? { ...u, status: "waiting" } : u))
    return saved
  } catch {
    return null
  }
}

function initialState(opts: StoreOptions): AppState {
  return {
    ...createEmptyData(),
    hydrated: false,
    booting: true,
    lang: opts.initialLang ?? "en",
    user: null,
    loginRole: "worker",
    loginPhone: DEMO_PHONE.worker,
    loginPin: "",
    loginError: null,
    loginBusy: false,
    accountType: "new",
    tab: "home",
    view: null,
    sheet: null,
    online: true,
    slow: false,
    loading: true,
    now: Date.now(),
    draft: null,
    addForm: null,
    setupIdx: 0,
    batchId: null,
    reviewId: null,
    rejectReason: null,
    rejectNote: "",
    wiz: null,
    cam: null,
    cel: null,
    sellStep: "form",
    toast: null,
    savedAt: 0,
    heroFlash: false,
  }
}

type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>)

const pad = (n: number) => String(n).padStart(2, "0")
const today = () => {
  const d = new Date()
  return { date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, short: pad(d.getDate()) + pad(d.getMonth() + 1) }
}
const coord = (n: number, positive: string, negative: string) => `${Math.abs(n).toFixed(4)}° ${n >= 0 ? positive : negative}`

/**
 * The app's state and business actions, kept outside React so actions always
 * see the latest state and background work (sync) can update it at any time.
 *
 * Every action changes the local copy first, so the app keeps working with no
 * signal; `sync` then sends the change to the backend and pulls what is new.
 */
function createStore(opts: StoreOptions) {
  const ref = { current: initialState(opts) }
  const listeners = new Set<() => void>()

  const set = (patch: Patch) => {
    ref.current = { ...ref.current, ...(typeof patch === "function" ? patch(ref.current) : patch) }
    listeners.forEach((notify) => notify())
  }

  const timers: number[] = []
  const later = (fn: () => void, ms: number) => {
    timers.push(window.setTimeout(fn, ms))
  }

  const t = (): Dict => translations[ref.current.lang]

  const toastTimer = { id: 0 }
  const toast = (msg: string, icon: IconName = "circle-check") => {
    window.clearTimeout(toastTimer.id)
    set({ toast: { msg, icon, k: Date.now() } })
    toastTimer.id = window.setTimeout(() => set({ toast: null }), 2600)
  }

  /* ---------------- session ---------------- */

  /** Sign the phone out locally. Work that never reached the backend is kept for the owner's next login. */
  const leave = () => {
    const s = ref.current
    const unsent = s.dirty.length + s.uploads.length + s.outbox.length > 0
    if (!unsent) {
      mediaStore.clear()
      set(createEmptyData())
    }
    set({ me: null, user: null, view: null, sheet: null, tab: "home", wiz: null, cam: null, cel: null, loginPin: "" })
  }

  const sync = createSync<AppState>({
    get: () => ref.current,
    set,
    onSessionLost: () => {
      if (!ref.current.me) return
      leave()
      toast(t().sessionExpired, "log-out")
    },
  })

  /** Start a session for the account the backend just confirmed. Returns false for accounts the app is not for. */
  const enter = (u: api.ServerUser) => {
    const me = api.sessionFromServer(u)
    if (!me) return false
    const s = ref.current
    // Someone else's cached data must never be shown to this account.
    const stranger = s.ownerId !== null && s.ownerId !== me.id
    if (stranger) mediaStore.clear()
    const base = stranger ? createEmptyData() : s
    const avatar = typeof u.avatar === "object" && u.avatar ? api.mediaFromServer(u.avatar) : null
    set({
      ...(stranger ? createEmptyData() : {}),
      me,
      ownerId: me.id,
      profiles: { ...base.profiles, [me.role]: api.profileFromServer(u) },
      site: typeof u.site === "object" && u.site ? u.site.name : base.site,
      avatarItem: base.uploads.some((x) => x.avatar) ? base.avatarItem : avatar,
      user: me.role,
      loginRole: me.role,
      loginPin: "",
      loginError: null,
      tab: me.role === "sup" ? "review" : "home",
      view: null,
    })
    return true
  }

  const refresh = async () => {
    set({ loading: true })
    const ok = await sync.pull()
    set({ loading: false })
    return ok
  }

  /** On app start: is this phone still signed in? */
  const boot = async () => {
    try {
      const u = await api.me<api.ServerUser>()
      if (u && enter(u)) await refresh()
      else leave()
    } catch {
      // Backend unreachable: keep working on the cached copy if this phone was signed in.
      const me = ref.current.me
      if (me) set({ user: me.role, tab: me.role === "sup" ? "review" : "home", online: false })
    }
    set({ booting: false, loading: false })
  }

  /* ---------------- helpers ---------------- */

  const find = (id: string | null | undefined) => ref.current.batches.find((b) => b.id === id)

  const updateBatch = (bid: string, fn: (b: Batch) => Batch) => {
    set((s) => ({
      batches: s.batches.map((b) => (b.id === bid ? fn({ ...b, v: { ...b.v } }) : b)),
      dirty: s.dirty.includes(bid) ? s.dirty : [...s.dirty, bid],
      savedAt: Date.now(),
    }))
    sync.touch(bid)
  }

  const setVal = (bid: string, k: string, val: Batch["v"][string]) =>
    updateBatch(bid, (b) => {
      b.v[k] = val
      return b
    })

  const withMoistureRow = (b: Batch, i: number, patch: Partial<MoistureReading>) => {
    const rows = [...moistureOf(b)]
    while (rows.length < 5) rows.push({ val: "", ph: null })
    rows[i] = { ...rows[i], ...patch }
    b.v.moist = rows
    return b
  }

  const queue = (op: OutboxOp) => {
    set((s) => ({ outbox: [...s.outbox, op] }))
    sync.schedule(0)
  }

  const myName = () => {
    const s = ref.current
    return nameParts(s.profiles[s.user ?? "worker"].name).short
  }

  const setupItems = (key: string) => ref.current.setup.find((c) => c.key === key)?.items ?? []

  const openWizard = (bid: string, day?: number, step?: number) => {
    const b = find(bid)
    if (!b) return
    if (b.day > 4 || b.status === "waiting") {
      set({ view: "batch", batchId: bid, sheet: null })
      return
    }
    set({ view: "wizard", wiz: { bid, day: day ?? b.day, step: step ?? b.step }, sheet: null, cel: null })
  }

  /** Send everything waiting on the phone now (the "Upload all" / "Retry" buttons). */
  const syncAll = (only?: string) => {
    const tt = t()
    if (!ref.current.online) {
      toast(tt.noNet, "wifi-off")
      return
    }
    void sync.flush(only).then((r) => {
      if (r.uploaded) toast(fill(tt.synced, { n: r.uploaded }), "cloud-check")
      else if (r.failed) toast(tt.stFailed, "cloud-off")
    })
  }

  /** Keep a captured file on the phone, show it straight away and queue it for upload. */
  const keepFile = (blob: Blob, upload: Omit<UploadItem, "id" | "status" | "at">): MediaItem => {
    const item: MediaItem = { id: rid(), pend: true, kind: upload.kind }
    mediaStore.put(item.id, blob)
    set((s) => ({
      uploads: [...s.uploads, { ...upload, id: item.id, status: "waiting", at: new Date().toISOString() }],
    }))
    sync.schedule(0)
    return item
  }

  const saveAvatar = (blob: Blob) => {
    // A newer photo replaces one that is still waiting to upload.
    ref.current.uploads.filter((u) => u.avatar).forEach((u) => mediaStore.remove(u.id))
    set((s) => ({ uploads: s.uploads.filter((u) => !u.avatar) }))
    const item = keepFile(blob, { kind: "photo", avatar: true, name: { en: "Profile photo", id: "Foto profil" } })
    set({ avatarItem: item, cam: null, sheet: null })
    toast(t().photoUpdated, "image")
  }

  const logout = async (nextRole?: Role) => {
    set({ sheet: null })
    // Last chance to get unsent work to the server before the session ends.
    if (ref.current.online) await sync.flush()
    sync.cancel()
    await api.logout()
    leave()
    if (nextRole) set({ loginRole: nextRole, loginPhone: DEMO_PHONE[nextRole], loginError: null })
    else toast(t().loggedOut, "log-out")
  }

  const actions = {
    toast,
    find,
    setupItems,

    /* ---------- navigation ---------- */
    setTab: (tab: Tab) => set({ tab, view: null }),
    openView: (view: View) => set({ view }),
    openBatch: (bid: string) => set({ view: "batch", batchId: bid }),
    openSheet: (sheet: SheetKind) => set(sheet === "sell" ? { sheet, sellStep: "form" } : { sheet }),
    closeSheet: () => set({ sheet: null }),
    back: () => {
      const s = ref.current
      if (s.view === "setupAdd") set({ view: s.addForm?.ret ? "wizard" : "setupList", addForm: null })
      else set({ view: s.view === "setupList" ? "setup" : null })
    },

    /* ---------- session ---------- */
    setLang: (lang: Lang) => {
      set({ lang })
      if (ref.current.me) queue({ id: rid(), kind: "lang", lang })
    },
    setLoginRole: (loginRole: Role) => set({ loginRole, loginPhone: DEMO_PHONE[loginRole], loginPin: "", loginError: null }),
    setLoginPhone: (loginPhone: string) => set({ loginPhone, loginError: null }),
    setLoginPin: (pin: string) => set({ loginPin: pin.replace(/\D/g, "").slice(0, PIN_LENGTH), loginError: null }),
    setAccountType: (accountType: AppState["accountType"]) => set({ accountType }),
    login: async () => {
      const s = ref.current
      const tt = t()
      if (s.loginBusy) return
      if (api.phoneToUsername(s.loginPhone).length < 8 || s.loginPin.length < PIN_LENGTH) {
        set({ loginError: tt.loginIncomplete })
        return
      }
      set({ loginBusy: true, loginError: null })
      try {
        const u = await api.login<api.ServerUser>(s.loginPhone, s.loginPin)
        if (!enter(u)) {
          // Admin accounts manage the backend; they have no screens in the app.
          await api.logout()
          set({ loginBusy: false, loginPin: "", loginError: tt.loginAdmin })
          return
        }
        set({ loginBusy: false, online: true })
        await refresh()
      } catch (e) {
        // Same message for a wrong number and a wrong PIN: do not reveal which accounts exist.
        set({ loginBusy: false, loginPin: "", loginError: e instanceof api.NetworkError ? tt.loginOffline : tt.loginFailed })
      }
    },
    logout: () => void logout(),
    switchRole: () => void logout(ref.current.user === "sup" ? "worker" : "sup"),

    /* ---------- connectivity & settings ---------- */
    toggleOnline: () => {
      const tt = t()
      if (ref.current.online) {
        set({ online: false })
        toast(tt.offlineToast, "wifi-off")
        return
      }
      set({ online: true })
      toast(tt.onlineToast, "wifi")
      // Send what was captured offline, then fetch what changed meanwhile.
      void sync.flush().then((r) => {
        if (r.uploaded) toast(fill(tt.synced, { n: r.uploaded }), "cloud-check")
        return sync.pull()
      })
    },
    toggleSlow: () => {
      const on = !ref.current.slow
      set({ slow: on })
      toast(on ? t().slowOnToast : t().slowOffToast, "gauge")
    },
    /** Throw away the cached copy of the server's data and fetch it again. */
    refresh: () => {
      const tt = t()
      if (!ref.current.online) {
        toast(tt.noNet, "wifi-off")
        return
      }
      void refresh().then((ok) => toast(ok ? tt.resetToast : tt.noNet, ok ? "rotate-ccw" : "wifi-off"))
    },
    syncAll,

    /* ---------- credits ---------- */
    sendSellRequest: () => {
      const s = ref.current
      queue({ id: rid(), kind: "sell", credits: s.credits.earned - s.credits.sold })
      set({ sellStep: "done" })
    },

    /* ---------- profile ---------- */
    openEditProfile: () => {
      const s = ref.current
      const cur = s.profiles[s.user ?? "worker"]
      set({ view: "editProfile", draft: { ...cur } })
    },
    setDraftField: (k: keyof Profile, val: string) => set((s) => ({ draft: s.draft ? { ...s.draft, [k]: val } : s.draft })),
    saveProfile: (valid: boolean) => {
      const s = ref.current
      if (!valid || !s.draft || !s.user) {
        toast(t().fixFields, "info")
        return
      }
      const d = s.draft
      const clean: Profile = { name: d.name.trim(), phone: d.phone.trim(), village: d.village.trim(), email: d.email.trim() }
      const role = s.user
      set((st) => ({ profiles: { ...st.profiles, [role]: clean }, view: null, draft: null }))
      queue({ id: rid(), kind: "profile", data: clean })
      toast(t().profileSaved, "circle-check")
    },
    takeAvatarPhoto: () =>
      set({
        sheet: null,
        cam: {
          avatar: true, kind: "photo", need: 1,
          label: { en: "Profile photo", id: "Foto profil" },
          tip: { en: "Face inside the frame, good light", id: "Wajah di dalam bingkai, cahaya terang" },
        },
      }),
    pickAvatarFromGallery: (file: File) => void fileToJpeg(file, ref.current.slow).then(saveAvatar),
    removeAvatar: () => {
      ref.current.uploads.filter((u) => u.avatar).forEach((u) => mediaStore.remove(u.id))
      set((s) => ({ sheet: null, avatarItem: null, uploads: s.uploads.filter((u) => !u.avatar) }))
      queue({ id: rid(), kind: "avatar", mediaId: null })
    },

    /* ---------- site setup ---------- */
    openSetupList: (setupIdx: number) => set({ view: "setupList", setupIdx }),
    openAdd: (key: string, ret: AddFormState["ret"] = null) => set({ addForm: { key, vals: {}, ret }, view: "setupAdd" }),
    setAddValue: (k: string, val: string) =>
      set((s) => (s.addForm ? { addForm: { ...s.addForm, vals: { ...s.addForm.vals, [k]: val } } } : {})),
    saveAdd: () => {
      const s = ref.current
      const a = s.addForm
      if (!a) return
      const tt = t()
      const fields = SETUP_FORMS[a.key]
      const vals = fields.map((f) => String(a.vals[f.k] ?? "").trim())
      const miss = fields.find((f, i) => (i === 0 || f.req) && !vals[i])
      if (miss) {
        toast(fill(tt.fieldNeeded, { f: L(miss.label, s.lang).toLowerCase() }), "info")
        return
      }
      const f2 = fields[1]
      let sub = f2 ? vals[1] : ""
      if (sub && f2.unit) sub = `${sub} ${f2.unit}`
      const name = vals[0]
      const ret = a.ret
      // Temporary id until the backend has saved the item and returns its own.
      const tempId = "t-" + rid()
      set((st) => ({
        setup: st.setup.map((c) => (c.key === a.key ? { ...c, items: [...c.items, { id: tempId, name, sub }] } : c)),
        addForm: null,
        view: ret ? "wizard" : "setupList",
      }))
      queue({ id: rid(), kind: "setupAdd", tempId, category: a.key, name, detail: sub })
      if (ret) setVal(ret.bid, ret.k, name)
      toast(fill(tt.addedItem, { n: name }), "circle-check")
    },
    removeSetupItem: (key: string, id: string) => {
      const unsent = ref.current.outbox.find((o) => o.kind === "setupAdd" && o.tempId === id)
      set((s) => ({
        setup: s.setup.map((c) => (c.key === key ? { ...c, items: c.items.filter((i) => i.id !== id) } : c)),
        outbox: unsent ? s.outbox.filter((o) => o.id !== unsent.id) : s.outbox,
      }))
      if (!unsent && !id.startsWith("t-")) queue({ id: rid(), kind: "setupRemove", remoteId: Number(id) })
      toast(t().removed, "trash-2")
    },
    callSupervisor: (name: string) => toast(fill(t().calling, { n: name }), "phone"),

    /* ---------- batches & wizard ---------- */
    openWizard,
    newBatch: () => {
      const s = ref.current
      const { date, short } = today()
      const id = `B-${short}-${rid().slice(0, 4).toUpperCase()}`
      const b: Batch = {
        id, bio: "", kg: 0, kiln: "", date, status: "progress", day: 1, step: 0, litres: 0, v: {},
        workerName: s.profiles.worker.name,
      }
      set((st) => ({
        batches: [b, ...st.batches],
        dirty: [...st.dirty, id],
        sheet: null, view: "wizard", wiz: { bid: id, day: 1, step: 0 }, cel: null,
      }))
      sync.touch(id)
    },
    fixBatch: (bid: string) => {
      const b0 = find(bid)
      if (!b0) return
      const step = b0.fixStep ?? 5
      const clr = b0.fixClear || "quench"
      updateBatch(bid, (b) => {
        b.fixing = true
        if (clr === "moist") b.v.moist = []
        else if (clr === "litres") b.v.litres = ""
        else b.v[clr] = []
        return b
      })
      set({ view: "wizard", wiz: { bid, day: 2, step } })
    },
    setVal,
    setMoisture: (bid: string, i: number, val: string) => updateBatch(bid, (b) => withMoistureRow(b, i, { val })),
    startBurn: (bid: string) => {
      setVal(bid, "burn", Date.now())
      toast(t().burnStarted, "flame")
    },
    captureLocation: (bid: string) => {
      const fail = () => toast(t().locFailed, "info")
      if (!navigator.geolocation) {
        fail()
        return
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          updateBatch(bid, (b) => {
            const label = `${coord(coords.latitude, "N", "S")}, ${coord(coords.longitude, "E", "W")}`
            b.v.loc = ref.current.site ? `${label} · ${ref.current.site}` : label
            b.v.lat = coords.latitude
            b.v.lng = coords.longitude
            return b
          }),
        fail,
        { enableHighAccuracy: true, timeout: 15000 }
      )
    },
    goToStep: (step: number) => set((s) => (s.wiz ? { wiz: { ...s.wiz, step } } : {})),
    exitWizard: () => {
      set({ view: null, wiz: null })
      toast(t().saved, "cloud-check")
    },
    completeStep: () => {
      const s = ref.current
      const w = s.wiz
      const tt = t()
      const b = w && find(w.bid)
      if (!w || !b) return
      const d = DAYS[w.day - 1]
      const st = d.steps[w.step]
      if (st.fields.some((f) => !fieldProgress(f, b).done)) {
        toast(tt.notYet, "info")
        return
      }
      if (b.fixing) {
        updateBatch(b.id, (bb) => {
          bb.fixing = false
          bb.status = "waiting"
          bb.reason = null
          if (bb.v.litres) bb.litres = parseFloat(String(bb.v.litres)) || bb.litres
          return bb
        })
        set({ view: null, wiz: null, cel: { kind: "res", bid: b.id, credits: b.litres * CREDIT_FACTOR } })
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
        const kg = Math.round(parseFloat(String(v.qty)) * (v.unit === "ton" ? 1000 : 1))
        const bio = String(v.btype ?? "")
        updateBatch(b.id, (bb) => ({ ...bb, kg, bio, day: 2, step: 0 }))
        cel = { kind: "d1", bid: b.id, kg, bio }
      } else if (w.day === 2) {
        const l = parseFloat(String(v.litres))
        updateBatch(b.id, (bb) => {
          bb.v.burnEnd = Date.now()
          return { ...bb, litres: l, kiln: String(v.kiln ?? ""), status: "waiting", day: 3, step: 0 }
        })
        cel = { kind: "d2", bid: b.id, credits: l * CREDIT_FACTOR, l }
      } else if (w.day === 3) {
        updateBatch(b.id, (bb) => ({ ...bb, day: 4, step: 0 }))
        cel = { kind: "d3", bid: b.id, n: String(v.bags ?? 0) }
      } else {
        updateBatch(b.id, (bb) => ({ ...bb, day: 5, step: 0, status: "done" }))
        cel = { kind: "batch", bid: b.id, credits: b.litres * CREDIT_FACTOR }
      }
      set({ view: null, wiz: null, cel })
    },
    closeCelebration: () => {
      const k = ref.current.cel?.kind
      const flash = k === "d2" || k === "res"
      set({ cel: null, tab: "home", view: null, heroFlash: flash })
      if (flash) later(() => set({ heroFlash: false }), 2600)
    },

    /* ---------- camera ---------- */
    openCamera: (bid: string, f: FieldDef, slot?: number) => {
      if (f.type === "moist" && slot != null) {
        set({
          cam: {
            bid, k: f.k, kind: "photo", need: 1, slot, tip: f.tip,
            label: { en: `Moisture ${slot + 1}`, id: `Kelembapan ${slot + 1}` },
          },
        })
      } else if (f.type === "media") {
        set({ cam: { bid, k: f.k, kind: f.kind, need: f.need, label: f.label, tip: f.tip } })
      }
    },
    closeCamera: () => set({ cam: null }),
    /** A photo or video came back from the camera. */
    capture: (blob: Blob) => {
      const s = ref.current
      const c = s.cam
      if (!c) return
      const tt = t()
      if (c.avatar) {
        saveAvatar(blob)
        return
      }
      if (!c.bid || !c.k) return
      const bid = c.bid
      const k = c.k
      const offline = !s.online
      const item = keepFile(blob, { kind: c.kind, bid, name: { en: L(c.label, "en"), id: L(c.label, "id") } })
      if (c.slot != null) {
        const slot = c.slot
        updateBatch(bid, (b) => withMoistureRow(b, slot, { ph: item }))
        set({ cam: null })
        toast(offline ? tt.savedOffline : tt.photoSaved, offline ? "cloud-off" : "camera")
        return
      }
      const have = mediaOf(find(bid) ?? ({ v: {} } as Batch), k).length + 1
      updateBatch(bid, (bb) => {
        bb.v[k] = [...mediaOf(bb, k), item]
        return bb
      })
      if (have >= c.need) {
        set({ cam: null })
        toast(fill(tt.allTaken, { x: L(c.label, s.lang).toLowerCase() }), "party-popper")
      } else if (offline) toast(tt.savedOffline, "cloud-off")
    },

    /* ---------- supervisor review ---------- */
    openReview: (bid: string) => set({ view: "sreview", reviewId: bid }),
    acceptReview: () => {
      const b = find(ref.current.reviewId)
      if (!b) return
      updateBatch(b.id, (bb) => ({
        ...bb, status: bb.day > 4 ? "done" : "approved", by: myName(), reason: null, rejectKey: null, rejectNote: "",
      }))
      set({ view: null })
      const w = nameParts(b.workerName ?? "").short
      toast(fill(t().acceptedToast, { c: (b.litres * CREDIT_FACTOR).toFixed(1), w }), "badge-check")
    },
    openReject: () => set({ sheet: "reject", rejectReason: null, rejectNote: "" }),
    pickRejectReason: (k: string) => set({ rejectReason: k }),
    setRejectNote: (rejectNote: string) => set({ rejectNote }),
    confirmReject: () => {
      const s = ref.current
      const r = REJECT_REASONS.find((x) => x.k === s.rejectReason)
      const b = find(s.reviewId)
      if (!r || !b) {
        toast(t().rejectTitle, "info")
        return
      }
      const note = s.rejectNote.trim()
      const suffix = note ? ` · ${note}` : ""
      updateBatch(b.id, (bb) => ({
        ...bb, status: "rejected", by: myName(),
        reason: { en: r.en + suffix, id: r.id + suffix }, fixStep: r.step, fixClear: r.clear,
        rejectKey: r.k, rejectNote: note,
      }))
      set({ sheet: null, view: null })
      toast(fill(t().rejectedToast, { w: nameParts(b.workerName ?? "").short }), "circle-x")
    },
  }

  return {
    actions,
    sync,
    boot,
    set,
    getState: () => ref.current,
    subscribe: (notify: () => void) => {
      listeners.add(notify)
      return () => void listeners.delete(notify)
    },
    dispose: () => {
      timers.forEach(window.clearTimeout)
      sync.cancel()
    },
  }
}

/**
 * Single source of truth for the app. Owns all state + business actions;
 * the page turns this into props for the (pure) feature screens.
 */
export function useArtisanStore(opts: StoreOptions = {}) {
  const [store] = useState(() => createStore(opts))
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)
  const { set, sync, actions } = store

  /* ---- lifecycle: restore the cache, resume the session, clock tick ---- */
  // Restore saved data after mount — the page is statically prerendered, so
  // reading localStorage during the first render would break hydration.
  useEffect(() => {
    set({ ...loadPersisted(), hydrated: true })
    void store.boot()
  }, [set, store])

  useEffect(() => {
    const tick = window.setInterval(() => set({ now: Date.now() }), 1000)
    return () => {
      window.clearInterval(tick)
      store.dispose()
    }
  }, [set, store])

  // Real connectivity. The header's online pill can still force "offline" to try the app without signal.
  useEffect(() => {
    const online = () => {
      set({ online: true })
      void sync.pull()
    }
    const offline = () => set({ online: false })
    window.addEventListener("online", online)
    window.addEventListener("offline", offline)
    return () => {
      window.removeEventListener("online", online)
      window.removeEventListener("offline", offline)
    }
  }, [set, sync])

  // While signed in, pick up what changed on the server (e.g. a supervisor's decision).
  const signedIn = !!state.me
  useEffect(() => {
    if (!signedIn) return
    const check = () => {
      const s = store.getState()
      if (document.visibilityState === "visible" && !s.wiz && !s.cam) void sync.pull()
    }
    const poll = window.setInterval(check, 20000)
    document.addEventListener("visibilitychange", check)
    return () => {
      window.clearInterval(poll)
      document.removeEventListener("visibilitychange", check)
    }
  }, [signedIn, sync, store])

  const {
    hydrated, lang, batches, credits, history, profiles, setup, uploads, supervisors, site, avatarItem, me, ownerId, dirty, outbox,
  } = state
  useEffect(() => {
    if (!hydrated) return
    try {
      const data: Persisted = {
        lang, batches, credits, history, profiles, setup, uploads, supervisors, site, avatarItem, me, ownerId, dirty, outbox,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* storage unavailable (private mode) — app still works in memory */
    }
  }, [hydrated, lang, batches, credits, history, profiles, setup, uploads, supervisors, site, avatarItem, me, ownerId, dirty, outbox])

  return { state, actions, t: translations[state.lang] }
}

export type ArtisanStore = ReturnType<typeof useArtisanStore>
export type ArtisanActions = ArtisanStore["actions"]
