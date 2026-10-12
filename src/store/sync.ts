import { pageState, type AppData, type BatchList } from "@/data/app-data"
import * as api from "@/lib/api"
import { L } from "@/lib/format"
import { mediaStore } from "@/lib/media-store"
import { applyRules } from "@/lib/rules"
import type { Batch, BatchValues, MediaItem, MoistureReading, OutboxOp, PendingRecord, UploadItem, UploadStatus } from "@/types"

type SyncState = AppData & { online: boolean }
type Patch<S> = Partial<S> | ((s: S) => Partial<S>)

export interface SyncHost<S extends SyncState> {
  get: () => S
  set: (patch: Patch<S>) => void
  /** The backend no longer accepts the session (expired, removed, or access switched off). */
  onSessionLost: (code: api.AccessCode | null) => void
  /** A Classic-app record was refused by the backend (shown to the worker). */
  onRecordRefused: (r: PendingRecord, message: string) => void
  /** Something the person sent was refused (the backend's message, shown as a toast). */
  onError: (message: string) => void
}

export interface FlushResult {
  uploaded: number
  failed: number
  sent: number
}

/** Stops the current run: no point trying the next item when the server cannot be reached. */
class Halt extends Error {}

const swap = (localId: string, item: MediaItem) => (x: MediaItem) => (x.id === localId ? item : x)

const replaceMedia = (v: BatchValues, localId: string, item: MediaItem): BatchValues => {
  const out: BatchValues = { ...v }
  for (const k of Object.keys(out)) {
    const val = out[k]
    if (!Array.isArray(val)) continue
    out[k] = (val as (MediaItem | MoistureReading)[]).map((x) =>
      "val" in x ? (x.ph?.id === localId ? { ...x, ph: item } : x) : x.id === localId ? item : x
    ) as BatchValues[string]
  }
  return out
}

const replaceRecordMedia = (data: PendingRecord["data"], localId: string, item: MediaItem): PendingRecord["data"] =>
  Object.fromEntries(
    Object.entries(data).map(([k, v]) => [
      k,
      Array.isArray(v)
        ? (v as (MediaItem | MoistureReading)[]).map((x) => (x && "val" in x ? (x.ph?.id === localId ? { ...x, ph: item } : x) : swap(localId, item)(x)))
        : v,
    ])
  ) as PendingRecord["data"]

const recordReady = (r: PendingRecord) =>
  Object.values(r.data).every((v) => !Array.isArray(v) || v.every((m) => !m.pend))

/** Media items → what the backend needs to attach them (the uploaded file ids). */
const forServer = (data: PendingRecord["data"]) =>
  Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.map((m) => ({ remoteId: m.remoteId })) : v]))

/**
 * Keeps the phone and the backend in step.
 *
 * The app works on its local copy first, so it stays usable offline. Every change is recorded as "still to send"
 * (a dirty batch, a queued upload, an outbox entry, a pending record) and sent whenever there is a connection;
 * then what changed on the server (a supervisor's or admin's decision, new totals) is pulled. The backend is the
 * single source of truth: whatever it returns replaces the local copy, except work not sent yet.
 */
export function createSync<S extends SyncState>({ get, set, onSessionLost, onRecordRefused, onError }: SyncHost<S>) {
  let running: Promise<FlushResult> | null = null
  let again = false
  let timer = 0
  /** Runs in a row that could not reach the server: the next try waits longer (up to a minute). */
  let failures = 0
  /** ETag of the last start-up data applied (per site), so an unchanged poll is cheap. */
  let lastEtag: { site: string | null; etag: string | null } = { site: null, etag: null }
  /** Bumped on every local edit, so a save in flight knows the batch changed under it. */
  const revision = new Map<string, number>()

  const patch = (p: Partial<AppData> | ((s: S) => Partial<AppData>)) => set(p as Patch<S>)
  const ready = () => get().online && !!get().me

  /** 401 → the sign-in is gone. 403 → access was switched off (the start-up call is refused too), or only this request. */
  async function sessionGone(e: unknown): Promise<api.AccessCode | null | false> {
    if (e instanceof api.SignedOutError) return "signed_out"
    if (e instanceof api.ApiError && e.status === 401) return "signed_out"
    if (!(e instanceof api.ApiError && e.status === 403)) return false
    try {
      await api.bootstrap()
      return false
    } catch (again) {
      return api.accessCode(again) ?? false
    }
  }

  async function failed(e: unknown, what: string) {
    if (e instanceof api.NetworkError) throw new Halt()
    // Busy or rate limited even after the client's own retries: stop this run, try again later.
    if (e instanceof api.ApiError && (e.status === 429 || e.status >= 500)) throw new Halt()
    const gone = await sessionGone(e)
    if (gone !== false) {
      onSessionLost(gone)
      throw new Halt()
    }
    // Refused (e.g. "already decided by the admin"): say why; the item is not sent again. The screen may still show
    // the refused change, so the next pull fetches the server's copy in full (not "unchanged since last time").
    if (e instanceof api.ApiError && e.code !== "duplicate") onError(e.message || what)
    lastEtag = { site: null, etag: null }
  }

  /* ---------------- uploads ---------------- */

  const setUpload = (id: string, status: UploadStatus) =>
    patch((s) => ({ uploads: s.uploads.map((u) => (u.id === id ? { ...u, status } : u)) }))
  const dropUpload = (id: string) => patch((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) }))

  function attach(u: UploadItem, item: MediaItem) {
    mediaStore.uploaded(u.id, item)
    if (u.avatar) {
      patch((s) => ({
        avatarItem: s.avatarItem?.id === u.id ? item : s.avatarItem,
        outbox: [...s.outbox, { id: u.id, kind: "avatar", mediaId: item.remoteId ?? null }],
      }))
      return
    }
    if (u.rid) {
      const rid = u.rid
      patch((s) => ({ pendingRecords: s.pendingRecords.map((r) => (r.id === rid ? { ...r, data: replaceRecordMedia(r.data, u.id, item) } : r)) }))
      // A form still open on screen holds the same items.
      set(((s: S & { recordForm?: { id: string; data: PendingRecord["data"] } | null }) =>
        s.recordForm?.id === rid ? { recordForm: { ...s.recordForm, data: replaceRecordMedia(s.recordForm.data, u.id, item) } } : {}) as Patch<S>)
      return
    }
    if (!u.bid) return
    const bid = u.bid
    touch(bid)
    patch((s) => ({
      batches: s.batches.map((b) => (b.id === bid ? { ...b, v: replaceMedia(b.v, u.id, item) } : b)),
      dirty: s.dirty.includes(bid) ? s.dirty : [...s.dirty, bid],
    }))
  }

  /** A Classic record can only be sent once all its files are uploaded: when one never will be, say so on the record. */
  function recordProblem(u: UploadItem, message: string) {
    if (!u.rid) return
    patch((s) => ({ pendingRecords: s.pendingRecords.map((r) => (r.id === u.rid ? { ...r, error: message } : r)) }))
  }

  async function uploadAll(result: FlushResult, only?: string) {
    // A refused upload ("failed") is only sent again when the person taps Retry; otherwise it would be re-sent and
    // reported on every refresh, using up mobile data.
    const queue = get().uploads.filter((u) => u.status !== "uploading" && (only ? u.id === only : u.status !== "failed"))
    for (const u of queue) {
      const blob = await mediaStore.get(u.id)
      if (!blob) {
        dropUpload(u.id) // the file is gone from the phone — nothing left to send
        recordProblem(u, `${L(u.name, "en")} is missing on this phone. Take it again.`)
        continue
      }
      // Larger than the backend accepts: it would only be refused, so it is marked failed straight away.
      const max = get().settings?.uploadLimits[u.kind]
      if (max && blob.size > max) {
        setUpload(u.id, "failed")
        result.failed++
        recordProblem(u, `${L(u.name, "en")} is too large.`)
        onError(`${L(u.name, "en")}: too large (${Math.round(blob.size / 1024 / 1024)} MB, at most ${Math.round(max / 1024 / 1024)} MB)`)
        continue
      }
      setUpload(u.id, "uploading")
      try {
        attach(u, await api.uploadMedia(blob, u.at, u.id))
        dropUpload(u.id)
        result.uploaded++
      } catch (e) {
        result.failed++
        const waiting = e instanceof api.NetworkError || (e instanceof api.ApiError && (e.status === 429 || e.status >= 500))
        setUpload(u.id, waiting ? "waiting" : "failed")
        if (!waiting && e instanceof api.ApiError && e.status !== 401) recordProblem(u, e.message)
        await failed(e, `upload "${L(u.name, "en")}"`)
      }
    }
  }

  /* ---------------- outbox ---------------- */

  async function send(op: OutboxOp) {
    switch (op.kind) {
      case "setupAdd": {
        const item = await api.createSetupItem(op.category, { name: op.name, sub: op.detail, clientId: op.tempId })
        patch((s) => ({
          setup: s.setup.map((c) =>
            c.key === op.category ? { ...c, items: c.items.map((i) => (i.id === op.tempId ? { ...item } : i)) } : c
          ),
        }))
        return
      }
      case "setupRemove":
        return void (await api.deleteSetupItem(op.category, op.remoteId))
      case "profile":
        return void (await api.updateProfile(op.data))
      case "avatar":
        return void (await api.updateAvatar(op.mediaId))
      case "sell":
        return void (await api.createSellRequest())
    }
  }

  async function sendOutbox(result: FlushResult) {
    for (const op of [...get().outbox]) {
      if (!get().me) return
      try {
        await send(op)
        result.sent++
      } catch (e) {
        await failed(e, op.kind)
      }
      patch((s) => ({ outbox: s.outbox.filter((o) => o.id !== op.id) }))
    }
  }

  /* ---------------- Classic records ---------------- */

  async function sendRecords(result: FlushResult) {
    for (const r of get().pendingRecords.filter((x) => !x.error && recordReady(x))) {
      try {
        // The record's id on the phone makes a resend safe (the backend returns the record already stored).
        await api.createRecord(r.kind, { ...forServer(r.data), date: r.at, siteId: r.siteId ?? undefined, clientId: r.id })
        patch((s) => ({ pendingRecords: s.pendingRecords.filter((x) => x.id !== r.id) }))
        result.sent++
      } catch (e) {
        // Refused for its content or a rule (400, 403 "mixing is off", 404, 409, 413…), not for the sign-in or load:
        // keep it with the reason instead of sending it again on every refresh.
        const refused = e instanceof api.ApiError && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 429 && !(e.status === 403 && e.code)
        if (refused) {
          // The backend refused the content (e.g. more biochar than available): keep it and say why.
          patch((s) => ({ pendingRecords: s.pendingRecords.map((x) => (x.id === r.id ? { ...x, error: e.message } : x)) }))
          onRecordRefused(r, e.message)
          continue
        }
        await failed(e, `record ${r.kind}`)
      }
    }
  }

  /* ---------------- batches ---------------- */

  async function save(b: Batch, asReviewer: boolean) {
    // Saving is by batch code, so a save whose reply was lost is simply sent again.
    if (asReviewer) return b.remoteId ? api.reviewBatch(b.id, api.reviewToServer(b)) : null
    return api.saveBatch(b.id, api.batchToServer(b))
  }

  async function saveBatches() {
    for (const bid of [...get().dirty]) {
      const s = get()
      const b = s.batches.find((x) => x.id === bid)
      const rev = revision.get(bid) ?? 0
      let fresh: Batch | null = null
      if (b) {
        try {
          // A supervisor's change to a batch is a review; anything else (e.g. their own Classic entries) a save.
          const reviewing = s.me?.role === "sup" && !!b.reviewing
          const doc = await save(b, reviewing)
          if (doc) fresh = api.batchFromServer(doc, get().rejectReasons, b.siteId)
        } catch (e) {
          await failed(e, `batch ${bid}`)
        }
      }
      patch((cur) => {
        const unchanged = (revision.get(bid) ?? 0) === rev
        return {
          // The server's copy (with its ids, decision and credits) replaces the local one unless it changed meanwhile.
          batches: cur.batches.map((x) => (x.id !== bid ? x : fresh && unchanged && !x.fixing ? fresh : { ...x, remoteId: fresh?.remoteId ?? x.remoteId })),
          dirty: unchanged ? cur.dirty.filter((d) => d !== bid) : cur.dirty,
        }
      })
    }
  }

  /* ---------------- public ---------------- */

  /** Record that a batch changed on the phone and send it shortly. */
  function touch(bid: string) {
    revision.set(bid, (revision.get(bid) ?? 0) + 1)
    schedule()
  }

  function schedule(ms = 900) {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void flush(), ms)
  }

  /** Send everything that is waiting. Safe to call at any time; runs never overlap. */
  function flush(only?: string): Promise<FlushResult> {
    if (!ready()) return Promise.resolve({ uploaded: 0, failed: 0, sent: 0 })
    if (running) {
      again = true
      return running
    }
    running = (async () => {
      const result: FlushResult = { uploaded: 0, failed: 0, sent: 0 }
      try {
        let target = only
        do {
          again = false
          await uploadAll(result, target)
          await sendOutbox(result)
          await saveBatches()
          await sendRecords(result)
          target = undefined
        } while (again && ready())
        failures = 0
      } catch (e) {
        if (!(e instanceof Halt)) console.warn("[sync]", e)
        // Could not reach the server: try again later, waiting longer each time.
        failures++
        if (get().online) schedule(Math.min(60_000, 2000 * 2 ** Math.min(failures, 5)))
      } finally {
        running = null
      }
      return result
    })()
    return running
  }

  /**
   * Send local changes, then refresh the local copy from the server. The poll, coming back online and returning to
   * the app can all fire together: they share one refresh instead of each sending its own.
   */
  let pulling: Promise<boolean> | null = null
  function pull(): Promise<boolean> {
    pulling ??= pullOnce().finally(() => (pulling = null))
    return pulling
  }

  async function pullOnce(): Promise<boolean> {
    if (!ready()) return false
    await flush()
    if (!get().me || !get().online) return false
    try {
      const site = get().me?.siteId ?? null
      const fresh = await api.bootstrapIfChanged(lastEtag.site === site ? lastEtag.etag : null)
      // Unchanged since the last pull (a 304): nothing to apply.
      if (!fresh) return true
      apply(fresh.data)
      lastEtag = { site: fresh.data.siteId, etag: fresh.etag }
      return true
    } catch (e) {
      const gone = await sessionGone(e)
      if (gone !== false) onSessionLost(gone)
      return false
    }
  }

  /** Take the server's start-up data, keeping whatever the phone has not sent yet. */
  function apply(data: api.Bootstrap) {
    const me = get().me
    if (!me) return
    applyRules(data.rules)
    api.setSite(data.siteId)
    patch((s) => {
      const reasons = data.rejectReasons
      // Anything still waiting to be sent is newer than the server's copy.
      const ahead = new Set([...s.dirty, ...s.uploads.map((u) => u.bid).filter(Boolean)])
      const keep = (b: Batch) => ahead.has(b.id) || !!b.fixing
      const incoming = [...data.batches.items, ...(data.queue?.items ?? []), ...(data.ongoing?.items ?? [])].map((d) => api.batchFromServer(d, reasons, data.siteId))
      const busy = (kind: OutboxOp["kind"]) => s.outbox.some((o) => o.kind === kind)
      const avatarPending = busy("avatar") || s.uploads.some((u) => u.avatar)
      const sameSite = s.me?.siteId === data.siteId
      const keepOlder = <T>(list: T[]) => (sameSite ? list : [])
      const page = (cur: { page: number }, p: api.Page<unknown> | null | undefined) => ({ ...pageState(p), page: sameSite ? Math.max(cur.page, p?.page ?? 1) : (p?.page ?? 1) })
      const recordsMerged = <K extends api.RecordKind>(k: K) => api.mergeById(keepOlder(s.records[k]) as never[], data.records[k].items as never[]) as api.RecordMap[K][]
      const sortByDate = <T extends { date: string }>(xs: T[]) => [...xs].sort((a, b) => b.date.localeCompare(a.date))
      const batchPages: Record<BatchList, ReturnType<typeof pageState>> = {
        ...s.batchPages,
        all: page(s.batchPages.all, data.batches),
        waiting: data.queue ? page(s.batchPages.waiting, data.queue) : s.batchPages.waiting,
        ongoing: data.ongoing ? page(s.batchPages.ongoing, data.ongoing) : s.batchPages.ongoing,
      }
      return {
        me: { ...me, ...api.sessionFromServer(data) },
        // Switching site drops the other site's batches, except work not sent yet.
        batches: api.sortBatches(api.mergeById(sameSite ? s.batches : s.batches.filter((b) => keep(b) || !b.remoteId), incoming, keep)),
        batchPages,
        setup: busy("setupAdd") || busy("setupRemove") ? s.setup : api.setupFromServer(data.setup, s.setup),
        supervisors: data.supervisors.items.map(api.supervisorFromServer),
        supervisorsPage: pageState(data.supervisors),
        profiles: busy("profile") ? s.profiles : { ...s.profiles, [me.role]: api.profileFromServer(data.person) },
        avatarItem: avatarPending ? s.avatarItem : data.person.photo,
        sites: data.sites,
        site: data.sites.find((x) => x.id === data.siteId)?.name ?? "",
        network: data.network,
        rules: data.rules,
        feedstocks: data.feedstocks,
        mixingTypes: data.mixingTypes,
        applicationTypes: data.applicationTypes,
        rejectReasons: reasons,
        settings: data.settings,
        stats: data.stats,
        records: {
          collections: sortByDate(recordsMerged("collections")),
          mixings: sortByDate(recordsMerged("mixings")),
          packagings: sortByDate(recordsMerged("packagings")),
          applications: sortByDate(recordsMerged("applications")),
        },
        recordPages: {
          collections: page(s.recordPages.collections, data.records.collections),
          mixings: page(s.recordPages.mixings, data.records.mixings),
          packagings: page(s.recordPages.packagings, data.records.packagings),
          applications: page(s.recordPages.applications, data.records.applications),
        },
        ...(busy("sell") ? {} : { credits: data.credits, history: data.history.items, historyPage: pageState(data.history) }),
      }
    })
    void loadRestOfSetup()
  }

  /** Setup lists are short: fetch their remaining pages straight away, so every choice is available. */
  async function loadRestOfSetup() {
    for (const list of get().setup) {
      let page = list.page ?? 1
      let more = !!list.hasMore
      while (more && get().me) {
        try {
          const next = await api.setupPage(list.key, page + 1)
          page = next.page
          more = next.hasMore
          patch((s) => ({
            setup: s.setup.map((c) => (c.key === list.key ? { ...c, items: api.mergeById(c.items, next.items), page, hasMore: more } : c)),
          }))
        } catch {
          return
        }
      }
    }
  }

  /** The next pull fetches the server's data in full, even if it has not changed (manual Refresh). */
  const forgetCopy = () => void (lastEtag = { site: null, etag: null })

  return { touch, schedule, flush, pull, apply, forgetCopy, cancel: () => window.clearTimeout(timer) }
}

export type Sync = ReturnType<typeof createSync>
