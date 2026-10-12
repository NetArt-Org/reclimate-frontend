import { fetchFile } from "@/lib/api"
import type { MediaItem } from "@/types"

/**
 * Photos and videos on the phone.
 *  - Files waiting to upload live in IndexedDB, so they survive a reload or a
 *    dead battery in the field.
 *  - Everything shown on screen is an object URL: either the local file, or
 *    the server's copy downloaded with the user's session (the backend does
 *    not serve evidence to anyone who is not signed in).
 */
const DB_NAME = "reclimate-media"
const STORE = "blobs"
/** Copies of files downloaded from the backend, so they show offline and are not downloaded again. */
const CACHE = "remote"
/** How many downloaded files are kept, and the largest kept (videos are usually bigger and not cached). */
const CACHE_MAX_ENTRIES = 300
const CACHE_MAX_BYTES = 3 * 1024 * 1024

const memory = new Map<string, Blob>()
const urls = new Map<string, string>()
const loading = new Map<string, Promise<string | null>>()

let dbPromise: Promise<IDBDatabase | null> | null = null
function db() {
  dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 2)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
        if (!req.result.objectStoreNames.contains(CACHE)) req.result.createObjectStore(CACHE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null) // private mode: files are kept in memory only
    }
  })
  return dbPromise
}

async function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>, store = STORE): Promise<T | undefined> {
  const d = await db()
  if (!d) return undefined
  return new Promise((resolve) => {
    try {
      const req = run(d.transaction(store, mode).objectStore(store))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(undefined)
    } catch {
      resolve(undefined)
    }
  })
}

const key = (id: string, thumb: boolean) => (thumb ? `${id}:t` : id)

/** Keep a downloaded file, dropping the oldest copies beyond the limit. */
async function cachePut(k: string, blob: Blob) {
  if (blob.size > CACHE_MAX_BYTES) return
  await idb("readwrite", (s) => s.put({ blob, at: Date.now() }, k), CACHE)
  const keys = (await idb<IDBValidKey[]>("readonly", (s) => s.getAllKeys(), CACHE)) ?? []
  if (keys.length <= CACHE_MAX_ENTRIES) return
  const all = (await idb<{ at: number }[]>("readonly", (s) => s.getAll(), CACHE)) ?? []
  const oldest = keys.map((key, i) => ({ key, at: all[i]?.at ?? 0 })).sort((a, b) => a.at - b.at).slice(0, keys.length - CACHE_MAX_ENTRIES)
  for (const o of oldest) await idb("readwrite", (s) => s.delete(o.key), CACHE)
}
const cacheGet = async (k: string) => (await idb<{ blob: Blob }>("readonly", (s) => s.get(k), CACHE))?.blob ?? null

export const mediaStore = {
  /** Keep a freshly captured file; it is shown immediately and uploaded later. */
  put(id: string, blob: Blob) {
    memory.set(id, blob)
    const url = URL.createObjectURL(blob)
    urls.set(key(id, false), url)
    urls.set(key(id, true), url)
    void idb("readwrite", (s) => s.put(blob, id))
  },

  async get(id: string): Promise<Blob | null> {
    return memory.get(id) ?? (await idb<Blob>("readonly", (s) => s.get(id))) ?? null
  },

  /** The file is on the server now: keep showing the local copy under its server id. */
  uploaded(localId: string, item: MediaItem) {
    for (const thumb of [false, true]) {
      const url = urls.get(key(localId, thumb))
      if (url) urls.set(key(item.id, thumb), url)
      urls.delete(key(localId, thumb))
    }
    memory.delete(localId)
    void idb("readwrite", (s) => s.delete(localId))
  },

  remove(id: string) {
    memory.delete(id)
    void idb("readwrite", (s) => s.delete(id))
  },

  /** Forget every file — used when the cached data is wiped on logout. */
  clear() {
    new Set(urls.values()).forEach((u) => URL.revokeObjectURL(u))
    urls.clear()
    memory.clear()
    loading.clear()
    void idb("readwrite", (s) => s.clear())
    void idb("readwrite", (s) => s.clear(), CACHE)
  },

  /** Already-resolved URL, for rendering without a flash. */
  peek: (item: MediaItem, thumb = false) => urls.get(key(item.id, thumb)) ?? null,

  /** Object URL for an item: the local file if it is still on the phone, else the server's copy. */
  url(item: MediaItem, thumb = false): Promise<string | null> {
    const k = key(item.id, thumb)
    const ready = urls.get(k)
    if (ready) return Promise.resolve(ready)
    let job = loading.get(k)
    if (!job) {
      job = (async () => {
        try {
          const local = await mediaStore.get(item.id)
          const remote = thumb ? (item.thumb ?? item.url) : item.url
          let blob: Blob | null = local
          if (!blob && remote) {
            // A copy downloaded before (works offline); otherwise download it and keep a copy.
            const cacheKey = `r:${remote}`
            blob = await cacheGet(cacheKey)
            if (!blob) {
              blob = await fetchFile(remote)
              void cachePut(cacheKey, blob)
            }
          }
          if (!blob) return null
          const url = URL.createObjectURL(blob)
          urls.set(k, url)
          return url
        } catch {
          return null
        } finally {
          loading.delete(k)
        }
      })()
      loading.set(k, job)
    }
    return job
  },
}
