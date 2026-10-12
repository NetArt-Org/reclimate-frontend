import { nameParts } from "@/lib/format"
import { stepFor } from "@/lib/rules"
import type { Batch, Profile, RejectReason, Session, SetupList, Supervisor } from "@/types"
import type { Bootstrap, ServerBatch, ServerPerson, ServerSetupList, Supervisor as ServerSupervisor } from "./types"

/* ------------------------------------------------------------------ */
/* Backend → app                                                       */
/* ------------------------------------------------------------------ */

export const sessionFromServer = (b: Bootstrap): Session => ({
  id: b.person.id,
  role: b.person.role,
  siteId: b.siteId,
  mustChangePassword: b.person.mustChangePassword,
})

export const profileFromServer = (p: ServerPerson): Profile => ({
  name: p.name,
  phone: p.phone,
  village: p.village,
  email: p.email,
})

export const supervisorFromServer = (u: ServerSupervisor): Supervisor => ({
  id: u.id,
  name: u.name,
  ini: nameParts(u.name).initials,
  role: u.role,
  phone: u.phone,
})

/**
 * A batch as the app works with it. A rejected one also gets where the worker must redo it: the reason's slot
 * (from the backend's reasons) and the wizard step that captures it. A reason written in the admin panel has no
 * slot, so the after-quench photo is asked for again by default.
 */
export function batchFromServer(d: ServerBatch, reasons: RejectReason[], siteId?: string | null): Batch {
  const { reasonText, ...rest } = d
  const b: Batch = { ...rest, siteId: siteId ?? null }
  if (d.status !== "rejected") {
    delete b.rejectKey
    delete b.rejectNote
    return b
  }
  const r = reasons.find((x) => x.key === d.rejectKey)
  b.reason = reasonText || r?.label || "Rejected"
  b.fixClear = r?.redo ?? "quench"
  b.fixStep = stepFor(b.fixClear)
  return b
}

/** Server lists, in the app's category order. */
export const setupFromServer = (lists: ServerSetupList[], current: SetupList[]): SetupList[] =>
  current.map((c) => {
    const l = lists.find((x) => x.key === c.key)
    return { key: c.key, items: l?.items ?? [], hasMore: !!l?.hasMore, page: l?.page ?? 1 }
  })

/** Merge a page into a list by id: the server's copy replaces the local one unless `keep` says the local one is newer. */
export function mergeById<T extends { id: string }>(current: T[], incoming: T[], keep?: (x: T) => boolean): T[] {
  const out = new Map(current.map((x) => [x.id, x]))
  for (const x of incoming) {
    const c = out.get(x.id)
    out.set(x.id, c && keep?.(c) ? c : x)
  }
  return [...out.values()]
}

/** "23/09/2026" → sortable "2026-09-23". */
const sortable = (d: string) => d.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1")

/** Newest first; batches not on the server yet stay on top. */
export const sortBatches = (bs: Batch[]) =>
  [...bs].sort((a, b) => Number(!!a.remoteId) - Number(!!b.remoteId) || sortable(b.date).localeCompare(sortable(a.date)))

/* ------------------------------------------------------------------ */
/* App → backend                                                       */
/* ------------------------------------------------------------------ */

/** What a worker's save sends: the wizard values and position. The backend decides what it may change. */
export const batchToServer = (b: Batch) => ({
  status: b.status,
  day: b.day,
  step: b.step,
  date: b.date,
  fixing: !!b.fixing,
  v: b.v,
  siteId: b.siteId ?? undefined,
})

/** A supervisor only ever sends the decision — never the worker's record. */
export function reviewToServer(b: Batch) {
  const approve = b.status !== "rejected"
  return {
    decision: approve ? "approve" : "reject",
    reasonKey: approve ? null : (b.rejectKey ?? null),
    note: approve ? "" : (b.rejectNote ?? ""),
  }
}
