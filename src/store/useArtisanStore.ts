"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import type { IconName } from "@/components/common/Icon"
import { createEmptyData, type AppData } from "@/data/app-data"
import { rid } from "@/data/constants"
import { translations, type Dict } from "@/data/i18n"
import * as api from "@/lib/api"
import { fill } from "@/lib/format"
import { mediaStore } from "@/lib/media-store"
import { onBackButton, onResume } from "@/lib/native"
import { applyRules } from "@/lib/rules"
import type { Batch, Lang, MediaItem, OutboxOp, UploadItem } from "@/types"
import { accountActions } from "./actions-account"
import { batchActions } from "./actions-batches"
import { recordActions } from "./actions-records"
import { initialState, type AppState, type Patch, type SheetKind, type StoreKit, type StoreOptions, type Tab, type View } from "./state"
import { createSync } from "./sync"

export type { AppState, AuthStep, CameraState, CelebrationKind, CelebrationState, ClassicTab, RecordForm, SheetKind, StoreOptions, Tab, View, WizardPos } from "./state"

/** Cached copy of the signed-in user's data. Never holds the session (Firebase keeps that, see lib/firebase). */
const STORAGE_KEY = "reclimate-dmrv-v4"
/** How often the app checks the server for changes while it is open (a supervisor's or admin's decision). */
const POLL_MS = 60_000

type Persisted = Partial<AppData & { lang: Lang; slow: boolean }>

function loadPersisted(): Persisted | null {
  try {
    // Copies kept by earlier versions do not match this one.
    for (const old of ["reclimate-dmrv-v2", "reclimate-dmrv-v3"]) localStorage.removeItem(old)
    const raw = localStorage.getItem(STORAGE_KEY)
    const saved: Persisted | null = raw ? JSON.parse(raw) : null
    // An upload interrupted by closing the app starts again.
    if (saved?.uploads) saved.uploads = saved.uploads.map((u) => (u.status === "uploading" ? { ...u, status: "waiting" } : u))
    return saved
  } catch {
    return null
  }
}

/**
 * The app's state and business actions, kept outside React so actions always see the latest state and background
 * work (sync) can update it at any time. Every action changes the local copy first, so the app keeps working with
 * no signal; `sync` then sends the change to the backend — the single source of truth — and pulls what is new.
 */
function createStore(opts: StoreOptions) {
  const ref = { current: initialState(opts) }
  const listeners = new Set<() => void>()

  const set = (patch: Patch) => {
    ref.current = { ...ref.current, ...(typeof patch === "function" ? patch(ref.current) : patch) }
    listeners.forEach((notify) => notify())
  }
  const get = () => ref.current

  const timers: number[] = []
  const later = (fn: () => void, ms: number) => void timers.push(window.setTimeout(fn, ms))

  const t = (): Dict => translations[ref.current.lang]

  const toastTimer = { id: 0 }
  const toast = (msg: string, icon: IconName = "circle-check") => {
    window.clearTimeout(toastTimer.id)
    set({ toast: { msg, icon, k: Date.now() } })
    toastTimer.id = window.setTimeout(() => set({ toast: null }), 2800)
  }

  /** Sign the phone out locally. Work that never reached the backend is kept for the owner's next login. */
  const leave = () => {
    const s = ref.current
    const unsent = s.dirty.length + s.uploads.length + s.outbox.length + s.pendingRecords.length > 0
    if (!unsent) {
      mediaStore.clear()
      set(createEmptyData(s.ui))
    }
    applyRules(null)
    api.setSite(null)
    set({
      me: null, user: null, view: null, sheet: null, tab: "home", cTab: "home", drawer: false, wiz: null, cam: null, cel: null, recordForm: null,
      authStep: "login", loginPassword: "", newPassword: "", newPassword2: "", loginBusy: false,
    })
  }

  const sync = createSync<AppState>({
    get,
    set,
    onSessionLost: (code) => {
      if (!ref.current.me) return
      void api.logout()
      leave()
      toast(code === "access_off" ? t().loginNoAccess : t().sessionExpired, "log-out")
    },
    onRecordRefused: (_r, message) => toast(message, "triangle-alert"),
    onError: (message) => toast(message, "triangle-alert"),
  })

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

  const queue = (op: OutboxOp) => {
    set((s) => ({ outbox: [...s.outbox, op] }))
    sync.schedule(0)
  }

  const keepFile = (blob: Blob, upload: Omit<UploadItem, "id" | "status" | "at">): MediaItem => {
    const item: MediaItem = { id: rid(), pend: true, kind: upload.kind }
    mediaStore.put(item.id, blob)
    set((s) => ({ uploads: [...s.uploads, { ...upload, id: item.id, status: "waiting", at: new Date().toISOString() }] }))
    sync.schedule(0)
    return item
  }

  const refresh = async () => {
    set({ loading: true })
    sync.forgetCopy()
    const ok = await sync.pull()
    set({ loading: false })
    return ok
  }

  const kit: StoreKit = { get, set, t, toast, later, sync, find, updateBatch, setVal, queue, keepFile, refresh, leave }
  const account = accountActions(kit)
  const batches = batchActions(kit, account.saveAvatar)
  const records = recordActions(kit, batches.startProcess)

  /** Send everything waiting on the phone now (the "Upload all" / "Retry" buttons). */
  const syncAll = (only?: string) => {
    const tt = t()
    if (!ref.current.online) return toast(tt.noNet, "wifi-off")
    void sync.flush(only).then((r) => {
      if (r.uploaded) toast(fill(tt.synced, { n: r.uploaded }), "cloud-check")
      else if (r.failed) toast(tt.stFailed, "cloud-off")
    })
  }

  /** Android back button: close what is open, step back, or let the app go to the background. */
  const back = (): boolean => {
    const s = ref.current
    if (s.cam) return set({ cam: null }), true
    if (s.cel) return batches.closeCelebration(), true
    if (s.sheet) return set({ sheet: null }), true
    if (s.drawer) return set({ drawer: false }), true
    if (s.view === "setupAdd") return set({ view: s.addForm?.ret ? (s.addForm.ret.bid === "form" ? "recordForm" : "wizard") : "setupList", addForm: null }), true
    if (s.view === "recordForm" || s.view === "sourcePick") return records.cancelRecordForm(), true
    if (s.view === "setupList") return set({ view: "setup" }), true
    if (s.view === "editProfile" && s.ui === "classic") return set({ view: "settings", draft: null }), true
    if (s.view) return set({ view: null, wiz: null }), true
    if (s.user && s.ui === "new" && s.tab !== (s.user === "sup" ? "review" : "home")) return set({ tab: s.user === "sup" ? "review" : "home" }), true
    if (s.user && s.ui === "classic" && s.cTab !== "home") return set({ cTab: "home" }), true
    if (!s.user && s.authStep !== "login" && s.authStep !== "pending") return set({ authStep: "login", loginError: null }), true
    return false
  }

  const actions = {
    toast,
    find,
    setupItems: (key: string) => ref.current.setup.find((c) => c.key === key)?.items ?? [],
    ...account,
    ...batches,
    ...records,

    /* ---------- navigation ---------- */
    setTab: (tab: Tab) => set({ tab, view: null }),
    openView: (view: View) => set({ view, drawer: false }),
    closeView: () => set({ view: null, draft: null }),
    openBatch: (bid: string) => set({ view: "batch", batchId: bid }),
    openSheet: (sheet: SheetKind) => set(sheet === "sell" ? { sheet, sellStep: "form", drawer: false } : { sheet, drawer: false }),
    closeSheet: () => set({ sheet: null }),
    back: () => void back(),
    hardwareBack: back,

    /* ---------- connectivity & settings ---------- */
    toggleSlow: () => {
      const on = !ref.current.slow
      set({ slow: on })
      toast(on ? t().slowOnToast : t().slowOffToast, "gauge")
    },
    /** Throw away the cached copy of the server's data and fetch it again. */
    refresh: () => {
      const tt = t()
      if (!ref.current.online) return toast(tt.noNet, "wifi-off")
      void refresh().then((ok) => toast(ok ? tt.resetToast : tt.noNet, ok ? "rotate-ccw" : "wifi-off"))
    },
    syncAll,
  }

  return {
    actions,
    sync,
    boot: account.boot,
    set,
    getState: get,
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
 * Single source of the app's data on the phone. The main page (app/page.tsx) calls this once and passes the
 * result down as props; no screen reads the store or the API itself.
 */
export function useArtisanStore(opts: StoreOptions = {}) {
  const [store] = useState(() => createStore(opts))
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)
  const { set, sync, actions } = store

  /* ---- lifecycle: restore the cache, resume the session, clock tick ---- */
  // Restore saved data after mount — the page is statically prerendered, so reading localStorage during the first
  // render would break hydration.
  useEffect(() => {
    const saved = loadPersisted()
    applyRules(saved?.rules ?? null)
    if (saved?.me?.siteId) api.setSite(saved.me.siteId)
    set({ ...saved, hydrated: true, online: typeof navigator === "undefined" ? true : navigator.onLine })
    void store.boot()
  }, [set, store])

  useEffect(() => {
    const tick = window.setInterval(() => set({ now: Date.now() }), 1000)
    return () => {
      window.clearInterval(tick)
      store.dispose()
    }
  }, [set, store])

  // Real connectivity: the backend is reached whenever the phone is online.
  useEffect(() => {
    const online = () => {
      set({ online: true })
      api.setOfflineMode(false)
      void sync.pull()
    }
    const offline = () => {
      set({ online: false })
      api.setOfflineMode(true)
    }
    window.addEventListener("online", online)
    window.addEventListener("offline", offline)
    return () => {
      window.removeEventListener("online", online)
      window.removeEventListener("offline", offline)
    }
  }, [set, sync])

  // Android's back button navigates inside the app.
  useEffect(() => onBackButton(actions.hardwareBack), [actions])

  // While signed in, pick up what changed on the server (e.g. a supervisor's or the admin's decision).
  const signedIn = !!state.me
  useEffect(() => {
    if (!signedIn) return
    const check = () => {
      const s = store.getState()
      if (document.visibilityState === "visible" && !s.wiz && !s.cam && !s.recordForm) void sync.pull()
    }
    const poll = window.setInterval(check, POLL_MS)
    document.addEventListener("visibilitychange", check)
    const stopResume = onResume(check)
    return () => {
      window.clearInterval(poll)
      document.removeEventListener("visibilitychange", check)
      stopResume()
    }
  }, [signedIn, sync, store])

  const {
    hydrated, lang, slow, ui, batches, batchPages, credits, history, historyPage, profiles, setup, uploads, supervisors, supervisorsPage, site, sites,
    network, rules, feedstocks, mixingTypes, applicationTypes, rejectReasons, settings, stats, records, recordPages, pendingRecords, avatarItem, me,
    ownerId, dirty, outbox,
  } = state
  useEffect(() => {
    if (!hydrated) return
    try {
      const data: Persisted = {
        lang, slow, ui, batches, batchPages, credits, history, historyPage, profiles, setup, uploads, supervisors, supervisorsPage, site, sites, network,
        rules, feedstocks, mixingTypes, applicationTypes, rejectReasons, settings, stats, records, recordPages, pendingRecords, avatarItem, me, ownerId,
        dirty, outbox,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* storage unavailable (private mode) — app still works in memory */
    }
  }, [
    hydrated, lang, slow, ui, batches, batchPages, credits, history, historyPage, profiles, setup, uploads, supervisors, supervisorsPage, site, sites,
    network, rules, feedstocks, mixingTypes, applicationTypes, rejectReasons, settings, stats, records, recordPages, pendingRecords, avatarItem, me,
    ownerId, dirty, outbox,
  ])

  return { state, actions, t: translations[state.lang] }
}

export type ArtisanStore = ReturnType<typeof useArtisanStore>
export type ArtisanActions = ArtisanStore["actions"]
