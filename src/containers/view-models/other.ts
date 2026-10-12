import { DAYS, SETUP, SETUP_FORMS } from "@/data/constants"
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
import { canUseGoogle } from "@/lib/firebase"
import { APP_VERSION } from "@/lib/native"
import type { Batch, MediaFieldDef, MediaItem, Profile } from "@/types"
import { batchTitle, batchYieldTitle, buildHeader, profileInfo, statusView, type VMContext } from "./context"
import { more } from "./worker"

/* ---------------- Supervisor ---------------- */

/** Day 2's photo/video fields — read when used, since the network's rules can change them (lib/rules). */
const burnFields = () => DAYS[1].steps.flatMap((st) => st.fields).filter((f): f is MediaFieldDef => f.type === "media")

/** The evidence a supervisor checks: every photo/video field of Day 2 (the burn). */
export const burnMedia = (b: Batch): MediaItem[] => [
  ...burnFields().flatMap((f) => mediaOf(b, f.k)),
  ...moistureOf(b).flatMap((m) => (m?.ph ? [m.ph] : [])),
]

/** Temperature readings of a batch ("680 · 700 °C"). */
export const temps = (b: Batch) =>
  Object.keys(b.v)
    .filter((k) => /^temp\d*$/.test(k) && b.v[k])
    .sort()
    .map((k) => String(b.v[k]))
    .join(" · ")

export function buildReviewQueue(ctx: VMContext): ReviewQueueScreenProps {
  const { s, a, t } = ctx
  const waiting = s.batches.filter((b) => b.status === "waiting")
  const counts = s.stats?.batches
  return {
    t,
    header: buildHeader(ctx),
    loading: s.loading && !s.stats,
    // Site totals from the backend (not only the batches loaded on this phone).
    counts: { toReview: counts?.waiting ?? waiting.length, approved: counts?.approved ?? 0, rejected: counts?.rejected ?? 0 },
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
    more: more(ctx, "waiting", s.batchPages.waiting.hasMore),
  }
}

export const buildReviewed = (ctx: VMContext): { items: ReviewedItem[]; more: ReturnType<typeof more> } => ({
  items: ctx.s.batches
    .filter((b) => ["approved", "rejected", "done"].includes(b.status))
    .map((b) => ({
      id: b.id,
      title: batchYieldTitle(b, ctx),
      sub: [b.kiln, b.date, b.adminDecision ? ctx.t.finalApproved : b.by].filter(Boolean).join(" · "),
      status: statusView(b, ctx),
      reason: b.status === "rejected" ? L(b.reason, ctx.lg) : null,
    })),
  more: more(ctx, "all", ctx.s.batchPages.all.hasMore),
})

export function buildReviewBatch(ctx: VMContext): ReviewBatchScreenProps | null {
  const { s, a, t, nf } = ctx
  const b = s.view === "sreview" ? s.batches.find((x) => x.id === s.reviewId) : undefined
  if (!b) return null
  const burnTime =
    b.v.burn && b.v.burnEnd ? formatElapsed(Number(b.v.burn), Number(b.v.burnEnd)).slice(0, 5).replace(":", "h ") + "m" : "—"
  const readings = s.rules?.moisture.readings ?? moistureOf(b).length
  return {
    t,
    title: batchTitle(b, ctx),
    sub: `${b.id} · ${b.kiln} · ${b.date}`,
    stats: [
      { label: t.biomass, value: b.kg ? `${nf(b.kg)} kg` : "—" },
      { label: t.biochar, value: `${nf(b.litres)} L` },
      { label: t.yield, value: b.kg ? `${nf((b.litres / b.kg) * 100)} L / 100 kg` : "—" },
      { label: t.burnTime, value: burnTime },
      { label: t.temperature, value: temps(b) ? `${temps(b)} °C` : "—" },
      { label: t.worker, value: nameParts(b.workerName ?? "").short || "—" },
    ],
    moisture: moistureOf(b).map((m) => ({ val: m.val, wet: isWet(m.val) })),
    groups: [
      ...burnFields().map((f) => {
        const items = mediaOf(b, f.k)
        return { label: L(f.label, ctx.lg), count: `${items.length}/${f.need}`, complete: items.length >= f.need, kind: f.kind, items }
      }),
      ...(readings
        ? [
            (() => {
              const items = moistureOf(b).flatMap((m) => (m?.ph ? [m.ph] : []))
              return { label: t.meterPhotos, count: `${items.length}/${readings}`, complete: items.length >= readings, kind: "photo" as const, items }
            })(),
          ]
        : []),
    ],
    onAccept: () => a.acceptReview(),
    onReject: () => a.openReject(),
    onBack: a.back,
  }
}

export const buildRejectSheet = ({ s, a, t }: VMContext): RejectSheetProps => ({
  t,
  open: s.sheet === "reject",
  // The reasons are the backend's, the same in every app.
  reasons: s.rejectReasons.map((r) => ({ key: r.key, label: r.label, selected: s.rejectReason === r.key, onPick: () => a.pickRejectReason(r.key) })),
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
    pendingUploads: s.uploads.length + s.pendingRecords.length,
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
    version: fill(t.versionW, { v: APP_VERSION }),
    ui: s.ui,
    onUiChange: (ui) => a.setAccountType(ui === "classic" ? "existing" : "new"),
    onPrivacy: () => a.openLink("privacy"),
    onTerms: () => a.openLink("terms"),
    onDeleteAccount: () => a.openSheet("deleteAccount"),
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
    ],
    email: d.email,
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
    count: `${a.setupItems(c.key).filter((x) => !x.pending).length} ${t.items}`,
    onOpen: () => a.openSetupList(i),
  })),
  onBack: a.back,
})

export function buildSetupList({ s, a, t, lg }: VMContext): SetupListScreenProps {
  const cat = SETUP[s.setupIdx]
  // The biomass reference is the network's (admin's) list: the app can only ask for a change.
  const readOnly = cat.key === "bioref"
  return {
    t,
    name: L(cat.name, lg),
    icon: cat.icon,
    items: a.setupItems(cat.key).map((x) => ({
      id: x.id, label: x.name, sub: x.sub, pending: !!x.pending, onRemove: readOnly ? null : () => a.removeSetupItem(cat.key, x.id),
    })),
    addLabel: cat.key === "kilns" ? t.requestKiln : cat.key === "bioref" ? t.requestDensity : t.addNew,
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
    title: f.key === "kilns" ? t.requestKiln : f.key === "bioref" ? t.requestDensity : fill(t.addNewOf, { x: L(cat.name, lg).toLowerCase() }),
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

export const buildSupervisors = (ctx: VMContext): SupervisorsScreenProps => ({
  t: ctx.t,
  people: ctx.s.supervisors.map((p) => ({ ...p, onCall: () => ctx.a.callPhone(p.name, p.phone) })),
  more: more(ctx, "supervisors", ctx.s.supervisorsPage.hasMore),
  onBack: ctx.a.back,
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
  // The person's sites (an admin assigns them); picking one reloads the app's data for it.
  sites: s.sites.map((x) => ({ name: x.name, selected: x.id === s.me?.siteId, onPick: () => void a.switchSite(x.id) })),
  onClose: a.closeSheet,
})

/* ---------------- Login & Register now ---------------- */

export const buildLogin = ({ s, a, t }: VMContext): LoginScreenProps => {
  const network = s.regOptions?.networks.find((n) => n.id === s.reg.networkId)
  return {
    t,
    lang: s.lang,
    onLangChange: a.setLang,
    accountType: s.ui === "classic" ? "existing" : "new",
    onAccountTypeChange: a.setAccountType,
    step: s.authStep,
    onStepChange: a.setAuthStep,
    email: s.loginEmail,
    onEmailChange: a.setLoginEmail,
    password: s.loginPassword,
    onPasswordChange: a.setLoginPassword,
    newPassword: s.newPassword,
    onNewPasswordChange: a.setNewPassword,
    newPassword2: s.newPassword2,
    onNewPassword2Change: a.setNewPassword2,
    showGoogle: canUseGoogle(),
    error: s.loginError,
    info: s.loginInfo,
    busy: s.loginBusy,
    onLogin: () => void a.login(),
    onGoogle: () => void a.loginWithGoogle(),
    onSendReset: () => void a.sendPasswordReset(),
    onSavePassword: () => void a.saveNewPassword(),
    onCancelPassword: a.cancelNewPassword,
    register: {
      name: s.reg.name,
      password2: s.reg.password2,
      phone: s.reg.phone,
      village: s.reg.village,
      role: s.reg.role,
      networkId: s.reg.networkId,
      siteId: s.reg.siteId,
      roles: s.regOptions?.roles ?? [],
      networks: (s.regOptions?.networks ?? []).map((n) => ({ value: n.id, label: n.name })),
      sites: (network?.sites ?? []).map((x) => ({ value: x.id, label: x.name })),
      loadingOptions: !s.regOptions && s.authStep === "registerDetails",
      note: s.regNote,
      onChange: (key, value) => a.setReg(key, value),
      onCreateAccount: () => void a.registerAccount(),
      onGoogle: () => void a.registerWithGoogle(),
      onSubmit: () => void a.submitRegistration(),
      onCheck: () => void a.checkApproval(),
      onApplyAgain: a.applyAgain,
      onLogout: a.cancelNewPassword,
      onConfirmVerified: () => void a.confirmVerified(),
      onResend: () => void a.resendVerification(),
    },
    onPrivacy: () => a.openLink("privacy"),
    onTerms: () => a.openLink("terms"),
  }
}
