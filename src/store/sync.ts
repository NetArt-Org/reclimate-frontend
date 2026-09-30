import type { AppData } from "@/data/app-data"
import * as api from "@/lib/api"
import { L } from "@/lib/format"
import { mediaStore } from "@/lib/media-store"
import type { Batch, BatchValues, MediaItem, MoistureReading, OutboxOp, UploadItem, UploadStatus } from "@/types"

type SyncState = AppData & { online: boolean }
type Patch<S> = Partial<S> | ((s: S) => Partial<S>)

export interface SyncHost<S extends SyncState> {
  get: () => S
  set: (patch: Patch<S>) => void
  /** The backend no longer accepts the session (expired, or the account was removed). */
  onSessionLost: () => void
}

export interface FlushResult {
  uploaded: number
  failed: number
}

/** Stops the current run: no point trying the next item when the server cannot be reached. */
class Halt extends Error {}

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

/**
 * Keeps the phone and the backend in step.
 *
 * The app always works on its local copy first, so it stays usable offline.
 * Every change is recorded as "still to send" (a dirty batch, a queued upload,
 * an outbox entry) and this module sends them whenever there is a connection,
 * then pulls what changed on the server (e.g. a supervisor's decision).
 */
export function createSync<S extends SyncState>({ get, set, onSessionLost }: SyncHost<S>) {
  let running: Promise<FlushResult> | null = null
  let again = false
  let timer = 0
  /** Bumped on every local edit, so a save in flight knows the batch changed under it. */
  const revision = new Map<string, number>()

  const patch = (p: Partial<AppData> | ((s: S) => Partial<AppData>)) => set(p as Patch<S>)
  const ready = () => get().online && !!get().me

  /** 401/403 → is the session gone, or was this one request just not allowed? */
  async function failed(e: unknown, what: string) {
    if (e instanceof api.NetworkError) throw new Halt()
    if (api.isAuthError(e)) {
      const user = await api.me().catch(() => undefined)
      if (user === null) {
        onSessionLost()
        throw new Halt()
      }
    }
    console.warn(`[sync] ${what} was refused by the server:`, e)
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
    if (!u.bid) return
    const bid = u.bid
    touch(bid)
    patch((s) => ({
      batches: s.batches.map((b) => (b.id === bid ? { ...b, v: replaceMedia(b.v, u.id, item) } : b)),
      dirty: s.dirty.includes(bid) ? s.dirty : [...s.dirty, bid],
    }))
  }

  async function uploadAll(result: FlushResult, only?: string) {
    const queue = get().uploads.filter((u) => u.status !== "uploading" && (!only || u.id === only))
    for (const u of queue) {
      const blob = await mediaStore.get(u.id)
      if (!blob) {
        dropUpload(u.id) // the file is gone from the phone — nothing left to send
        continue
      }
      setUpload(u.id, "uploading")
      try {
        const doc = await api.uploadMedia(blob, { alt: L(u.name, "en"), capturedAt: u.at })
        attach(u, api.mediaFromServer(doc))
        dropUpload(u.id)
        result.uploaded++
      } catch (e) {
        result.failed++
        setUpload(u.id, e instanceof api.NetworkError ? "waiting" : "failed")
        await failed(e, `upload "${L(u.name, "en")}"`)
      }
    }
  }

  /* ---------------- outbox ---------------- */

  async function send(op: OutboxOp, userId: number) {
    switch (op.kind) {
      case "setupAdd": {
        const doc = await api.createSetupItem({ category: op.category, name: op.name, detail: op.detail })
        patch((s) => ({
          setup: s.setup.map((c) =>
            c.key === op.category
              ? { ...c, items: c.items.map((i) => (i.id === op.tempId ? { ...i, id: String(doc.id) } : i)) }
              : c
          ),
        }))
        return
      }
      case "setupRemove":
        return void (await api.deleteSetupItem(op.remoteId))
      case "profile":
        return void (await api.updateProfile(userId, op.data))
      case "avatar":
        return void (await api.updateAvatar(userId, op.mediaId))
      case "lang":
        return void (await api.updateLang(userId, op.lang))
      case "sell":
        return void (await api.createSellRequest(op.credits))
    }
  }

  async function sendOutbox() {
    for (const op of [...get().outbox]) {
      const me = get().me
      if (!me) return
      try {
        await send(op, me.id)
      } catch (e) {
        await failed(e, op.kind)
      }
      patch((s) => ({ outbox: s.outbox.filter((o) => o.id !== op.id) }))
    }
  }

  /* ---------------- batches ---------------- */

  async function save(b: Batch, asReviewer: boolean) {
    if (asReviewer) return b.remoteId ? api.updateBatch(b.remoteId, api.reviewToServer(b)) : null
    const data = api.batchToServer(b)
    if (b.remoteId) return api.updateBatch(b.remoteId, data)
    try {
      return await api.createBatch(data)
    } catch (e) {
      // A lost reply can leave the batch created on the server without the phone
      // knowing its id. Find it by code and carry on as an update.
      if (!(e instanceof api.ApiError) || e.status !== 400) throw e
      const existing = await api.findBatchByCode(b.id)
      if (!existing) throw e
      return api.updateBatch(existing.id, data)
    }
  }

  async function saveBatches() {
    for (const bid of [...get().dirty]) {
      const s = get()
      const b = s.batches.find((x) => x.id === bid)
      const rev = revision.get(bid) ?? 0
      let remoteId = b?.remoteId
      if (b) {
        try {
          remoteId = (await save(b, s.me?.role === "sup"))?.id ?? remoteId
        } catch (e) {
          await failed(e, `batch ${bid}`)
        }
      }
      patch((cur) => ({
        batches: cur.batches.map((x) => (x.id === bid ? { ...x, remoteId } : x)),
        // Edited again while saving → stays dirty and is sent on the next pass.
        dirty: (revision.get(bid) ?? 0) === rev ? cur.dirty.filter((d) => d !== bid) : cur.dirty,
      }))
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
    if (!ready()) return Promise.resolve({ uploaded: 0, failed: 0 })
    if (running) {
      again = true
      return running
    }
    running = (async () => {
      const result: FlushResult = { uploaded: 0, failed: 0 }
      try {
        let target = only
        do {
          again = false
          await uploadAll(result, target)
          await sendOutbox()
          await saveBatches()
          target = undefined
        } while (again && ready())
      } catch (e) {
        if (!(e instanceof Halt)) console.warn("[sync]", e)
      } finally {
        running = null
      }
      return result
    })()
    return running
  }

  /** Send local changes, then replace the local copy with the server's. */
  async function pull(): Promise<boolean> {
    if (!ready()) return false
    await flush()
    const me = get().me
    if (!me || !get().online) return false
    try {
      const [user, batches, setup, supervisors, transactions] = await Promise.all([
        api.me<api.ServerUser>(),
        api.listBatches(),
        api.listSetupItems(),
        api.listSupervisors(),
        me.role === "worker" ? api.listTransactions() : Promise.resolve(null),
      ])
      if (!user) {
        onSessionLost()
        return false
      }
      patch((s) => {
        // Anything still waiting to be sent is newer than the server's copy.
        const ahead = new Set([...s.dirty, ...s.uploads.map((u) => u.bid)])
        const local = new Map(s.batches.map((b) => [b.id, b]))
        const keepLocal = (b: Batch | undefined): b is Batch => !!b && (ahead.has(b.id) || !!b.fixing)
        const fromServer = batches.map((d) => {
          const mine = local.get(d.code)
          return keepLocal(mine) ? mine : api.batchFromServer(d)
        })
        const codes = new Set(batches.map((d) => d.code))
        const unsent = s.batches.filter((b) => !b.remoteId && !codes.has(b.id))

        const busy = (kind: OutboxOp["kind"]) => s.outbox.some((o) => o.kind === kind)
        const avatarPending = busy("avatar") || s.uploads.some((u) => u.avatar)
        const avatar = typeof user.avatar === "object" && user.avatar ? api.mediaFromServer(user.avatar) : null
        const site = typeof user.site === "object" && user.site ? user.site.name : s.site

        return {
          batches: [...unsent, ...fromServer],
          setup: busy("setupAdd") || busy("setupRemove") ? s.setup : api.setupFromServer(setup, s.setup),
          supervisors: supervisors.map(api.supervisorFromServer),
          profiles: busy("profile") ? s.profiles : { ...s.profiles, [me.role]: api.profileFromServer(user) },
          avatarItem: avatarPending ? s.avatarItem : avatar,
          site,
          ...(transactions ? api.creditsFromServer(transactions) : {}),
        }
      })
      return true
    } catch (e) {
      if (api.isAuthError(e)) {
        const user = await api.me().catch(() => undefined)
        if (user === null) onSessionLost()
      }
      return false
    }
  }

  return { touch, schedule, flush, pull, cancel: () => window.clearTimeout(timer) }
}

export type Sync = ReturnType<typeof createSync>
