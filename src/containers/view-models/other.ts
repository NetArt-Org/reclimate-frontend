import { DAYS, REJECT_REASONS, SETUP, SETUP_FORMS } from "@/data/constants"
import type { LoginScreenProps } from "@/features/auth/LoginScreen"
import type { EditProfileScreenProps } from "@/features/profile/EditProfileScreen"
import type { ProfileScreenProps } from "@/features/profile/ProfileScreen"
import type { SetupAddScreenProps, SetupListScreenProps, SetupScreenProps, SupervisorsScreenProps } from "@/features/setup/SetupScreens"
import type { SiteSheetProps } from "@/features/shared/SiteSheet"
import type { RejectSheetProps } from "@/features/supervisor/RejectSheet"
import type { ReviewBatchScreenProps } from "@/features/supervisor/ReviewBatchScreen"
import type { ReviewQueueScreenProps } from "@/features/supervisor/ReviewQueueScreen"
import type { ReviewedItem } from "@/features/supervisor/ReviewedScreen"
import type { UploadsScreenProps } from "@/features/uploads/UploadsScreen"
import { isWet, mediaOf, moistureOf } from "@/lib/batch"
import { L, fill, formatElapsed, nameParts } from "@/lib/format"
import { PIN_LENGTH } from "@/store/useArtisanStore"
import type { Batch, MediaFieldDef, MediaItem, Profile } from "@/types"
import { batchTitle, batchYieldTitle, buildHeader, profileInfo, statusView, type VMContext } from "./context"

/* ---------------- Supervisor ---------------- */

/** The evidence a supervisor checks: every photo/video field of Day 2 (the burn). */
const BURN_MEDIA = DAYS[1].steps.flatMap((st) => st.fields).filter((f): f is MediaFieldDef => f.type === "media")

const burnMedia = (b: Batch): MediaItem[] => [
  ...BURN_MEDIA.flatMap((f) => mediaOf(b, f.k)),
  ...moistureOf(b).flatMap((m) => (m?.ph ? [m.ph] : [])),
]

export function buildReviewQueue(ctx: VMContext): ReviewQueueScreenProps {
  const { s, a, t } = ctx
  const waiting = s.batches.filter((b) => b.status === "waiting")
  return {
    t,
    header: buildHeader(ctx),
    loading: s.loading,
    counts: {
      toReview: waiting.length,
      approved: s.batches.filter((b) => b.status === "approved" || b.status === "done").length,
      rejected: s.batches.filter((b) => b.status === "rejected").length,
    },
    queue: waiting.map((b) => ({
      id: b.id,
      title: batchYieldTitle(b, ctx),
      sub: `${b.kiln} · ${b.date}`,
      worker: b.workerName ?? "",
      moisture: moistureOf(b).map((m) => m.val + "%").join(" · "),
      media: burnMedia(b).slice(0, 4),
      extraMedia: Math.max(0, burnMedia(b).length - 4),
      onReview: () => a.openReview(b.id),
    })),
  }
}

export const buildReviewed = (ctx: VMContext): ReviewedItem[] =>
  ctx.s.batches
    .filter((b) => ["approved", "rejected", "done"].includes(b.status))
    .map((b) => ({
      id: b.id,
      title: batchYieldTitle(b, ctx),
      sub: `${b.kiln} · ${b.date}`,
      status: statusView(b, ctx),
      reason: b.status === "rejected" ? L(b.reason, ctx.lg) : null,
    }))

export function buildReviewBatch(ctx: VMContext): ReviewBatchScreenProps | null {
  const { s, a, t, nf } = ctx
  const b = s.view === "sreview" ? s.batches.find((x) => x.id === s.reviewId) : undefined
  if (!b) return null
  const burnTime =
    b.v.burn && b.v.burnEnd
      ? formatElapsed(Number(b.v.burn), Number(b.v.burnEnd)).slice(0, 5).replace(":", "h ") + "m"
      : "—"
  return {
    t,
    title: batchTitle(b, ctx),
    sub: `${b.id} · ${b.kiln} · ${b.date}`,
    stats: [
      { label: t.biomass, value: `${nf(b.kg)} kg` },
      { label: t.biochar, value: `${nf(b.litres)} L` },
      { label: t.yield, value: b.kg ? `${nf((b.litres / b.kg) * 100)} L / 100 kg` : "—" },
      { label: t.burnTime, value: burnTime },
      { label: t.temperature, value: b.v.temp ? `${b.v.temp} °C` : "—" },
      { label: t.worker, value: nameParts(b.workerName ?? "").short || "—" },
    ],
    moisture: moistureOf(b).map((m) => ({ val: m.val, wet: isWet(m.val) })),
    groups: [
      ...BURN_MEDIA.map((f) => {
        const items = mediaOf(b, f.k)
        return { label: L(f.label, ctx.lg), count: `${items.length}/${f.need}`, complete: items.length >= f.need, kind: f.kind, items }
      }),
      (() => {
        const items = moistureOf(b).flatMap((m) => (m?.ph ? [m.ph] : []))
        return { label: t.meterPhotos, count: `${items.length}/5`, complete: items.length >= 5, kind: "photo" as const, items }
      })(),
    ],
    onAccept: a.acceptReview,
    onReject: a.openReject,
    onBack: a.back,
  }
}

export const buildRejectSheet = ({ s, a, t, lg }: VMContext): RejectSheetProps => ({
  t,
  open: s.sheet === "reject",
  reasons: REJECT_REASONS.map((r) => ({
    key: r.k,
    label: L(r, lg),
    selected: s.rejectReason === r.k,
    onPick: () => a.pickRejectReason(r.k),
  })),
  note: s.rejectNote,
  onNoteChange: a.setRejectNote,
  canConfirm: !!s.rejectReason,
  onConfirm: a.confirmReject,
  onClose: a.closeSheet,
})

/* ---------------- Profile ---------------- */

export function buildProfile(ctx: VMContext): ProfileScreenProps {
  const { s, a, t } = ctx
  const p = profileInfo(ctx)
  return {
    t,
    name: p.name,
    role: p.roleLabel,
    phone: p.phone,
    site: s.site,
    initials: p.initials,
    photo: p.photo,
    avatarTone: p.avatarTone,
    lang: s.lang,
    slow: s.slow,
    isWorker: s.user === "worker",
    pendingUploads: s.uploads.length,
    onOpenPhoto: () => a.openSheet("photo"),
    onEdit: a.openEditProfile,
    onLangChange: a.setLang,
    onToggleSlow: a.toggleSlow,
    onOpenUploads: () => a.openView("uploads"),
    onOpenSetup: () => a.openView("setup"),
    onOpenSupervisors: () => a.openView("sups"),
    onSwitchRole: a.switchRole,
    onRefresh: a.refresh,
    onLogout: () => a.openSheet("logout"),
  }
}

export function buildEditProfile(ctx: VMContext): EditProfileScreenProps | null {
  const { s, a, t } = ctx
  const d = s.draft
  if (s.view !== "editProfile" || !d) return null
  const p = profileInfo(ctx)
  const nameBad = !d.name.trim()
  const phoneBad = d.phone.replace(/\D/g, "").length < 8
  const field = (key: keyof Profile, icon: EditProfileScreenProps["fields"][number]["icon"], label: string, type: "text" | "tel" | "email", placeholder: string, error: string | null) => ({
    key, icon, label, type, placeholder, error, value: d[key] ?? "", onChange: (v: string) => a.setDraftField(key, v),
  })
  return {
    t,
    initials: p.initials,
    photo: p.photo,
    avatarTone: p.avatarTone,
    fields: [
      field("name", "user-round", t.fullName, "text", "Pak / Ibu …", nameBad ? t.nameRequired : null),
      field("phone", "phone", t.phoneLbl, "tel", "+62 …", phoneBad ? t.phoneRequired : null),
      field("village", "house", t.village, "text", t.villagePh, null),
      field("email", "mail", t.email, "email", "name@email.com", null),
    ],
    role: p.roleLabel,
    site: s.site,
    canSave: !nameBad && !phoneBad,
    onOpenPhoto: () => a.openSheet("photo"),
    onSave: () => a.saveProfile(!nameBad && !phoneBad),
    onBack: a.back,
  }
}

/* ---------------- Site setup & uploads ---------------- */

export const buildSetup = ({ a, t, lg }: VMContext): SetupScreenProps => ({
  t,
  categories: SETUP.map((c, i) => ({
    key: c.key,
    icon: c.icon,
    name: L(c.name, lg),
    count: `${a.setupItems(c.key).length} ${t.items}`,
    onOpen: () => a.openSetupList(i),
  })),
  onBack: a.back,
})

export function buildSetupList({ s, a, t, lg }: VMContext): SetupListScreenProps {
  const cat = SETUP[s.setupIdx]
  return {
    t,
    name: L(cat.name, lg),
    icon: cat.icon,
    items: a.setupItems(cat.key).map((x) => ({ id: x.id, label: x.name, sub: x.sub, onRemove: () => a.removeSetupItem(cat.key, x.id) })),
    onAdd: () => a.openAdd(cat.key),
    onBack: a.back,
  }
}

export function buildSetupAdd({ s, a, t, lg }: VMContext): SetupAddScreenProps | null {
  const f = s.addForm
  if (s.view !== "setupAdd" || !f) return null
  const cat = SETUP.find((c) => c.key === f.key)!
  return {
    t,
    icon: cat.icon,
    title: fill(t.addNewOf, { x: L(cat.name, lg).toLowerCase() }),
    fields: SETUP_FORMS[f.key].map((fd, i) => ({
      key: fd.k,
      label: L(fd.label, lg) + (i > 0 && !fd.req ? ` (${t.optional})` : ""),
      icon: fd.icon,
      type: fd.type,
      unit: fd.unit,
      value: f.vals[fd.k] ?? "",
      onChange: (v: string) => a.setAddValue(fd.k, v),
    })),
    fromWizard: !!f.ret,
    onSave: a.saveAdd,
    onBack: a.back,
  }
}

export const buildSupervisors = ({ s, a, t, lg }: VMContext): SupervisorsScreenProps => ({
  t,
  people: s.supervisors.map((p) => ({ ...p, role: L(p.role, lg), onCall: () => a.callSupervisor(p.name) })),
  onBack: a.back,
})

export const buildUploads = ({ s, a, t, lg }: VMContext): UploadsScreenProps => ({
  t,
  offline: !s.online,
  items: s.uploads.map((u) => ({
    id: u.id,
    name: L(u.name, lg),
    media: { id: u.id, pend: true, kind: u.kind },
    status: u.status,
    statusText: u.status === "failed" ? t.stFailed : u.status === "uploading" ? t.stUploading : t.stWaiting,
    onRetry: () => a.syncAll(u.id),
  })),
  onSyncAll: () => a.syncAll(),
  onBack: a.back,
})

export const buildSiteSheet = ({ s, a, t }: VMContext): SiteSheetProps => ({
  open: s.sheet === "site",
  title: t.siteTitle,
  // An account belongs to one site; an admin moves people between sites in the backend.
  sites: s.site ? [{ name: s.site, selected: true, onPick: a.closeSheet }] : [],
  onClose: a.closeSheet,
})

/* ---------------- Login ---------------- */

export const buildLogin = ({ s, a, t }: VMContext): LoginScreenProps => ({
  t,
  lang: s.lang,
  onLangChange: a.setLang,
  accountType: s.accountType,
  onAccountTypeChange: a.setAccountType,
  roles: [
    { value: "worker", icon: "shovel", title: t.roleWorker, sub: t.roleWorkerSub },
    { value: "sup", icon: "clipboard-check", title: t.roleSup, sub: t.roleSupSub },
  ],
  role: s.loginRole,
  onRoleChange: a.setLoginRole,
  phone: s.loginPhone,
  onPhoneChange: a.setLoginPhone,
  pin: s.loginPin,
  pinLength: PIN_LENGTH,
  onPinChange: a.setLoginPin,
  error: s.loginError,
  busy: s.loginBusy,
  onLogin: a.login,
})
