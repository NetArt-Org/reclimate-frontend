import { createEmptyData } from "@/data/app-data"
import { SETUP_FORMS, rid } from "@/data/constants"
import * as api from "@/lib/api"
import { L, fill } from "@/lib/format"
import * as fb from "@/lib/firebase"
import { fileToJpeg } from "@/lib/image"
import { mediaStore } from "@/lib/media-store"
import { callPhone } from "@/lib/native"
import type { Profile, UiVariant } from "@/types"
import type { AddFormState, AppState, AuthStep, StoreKit } from "./state"

/** Sign-in, Register now, approval, password, site, profile, site setup and credits. */
export function accountActions(k: StoreKit) {
  const { get, set, t, toast, sync, queue } = k

  /* ---------------- session ---------------- */

  /** Start a session for the account the backend just confirmed. */
  const enter = (data: api.Bootstrap) => {
    const me = api.sessionFromServer(data)
    const s = get()
    // Someone else's cached data must never be shown to this account.
    const stranger = s.ownerId !== null && s.ownerId !== me.id
    if (stranger) mediaStore.clear()
    set({
      ...(stranger ? createEmptyData(s.ui) : {}),
      me,
      ownerId: me.id,
      user: me.role,
      authStep: "login",
      loginPassword: "",
      newPassword: "",
      newPassword2: "",
      loginError: null,
      loginInfo: null,
      loginBusy: false,
      online: true,
      tab: me.role === "sup" ? "review" : "home",
      cTab: "home",
      view: null,
    })
    sync.apply(data)
    if (!me.siteId) toast(t().noSite, "info")
  }

  /** A temporary password from the admin must be replaced before the app opens. */
  let pending: api.Bootstrap | null = null
  const afterSignIn = async (data: api.Bootstrap) => {
    if (data.person.mustChangePassword && (await fb.signInProvider()) === "password") {
      pending = data
      set({ authStep: "setPassword", loginBusy: false, loginPassword: "", loginError: null, loginInfo: null })
      return
    }
    enter(data)
    void sync.flush()
  }

  /** Register now: the sign-up details form, with networks/sites from the backend. */
  const toDetails = async (step: AuthStep = "registerDetails") => {
    const info = fb.accountInfo()
    set((s) => ({ authStep: step, loginBusy: false, loginError: null, reg: { ...s.reg, name: s.reg.name || info.name }, loginEmail: s.loginEmail || info.email }))
    try {
      set({ regOptions: await api.registerOptions() })
    } catch (e) {
      set({ loginError: e instanceof api.NetworkError ? t().loginOffline : t().loginGeneric })
    }
  }

  /** The backend would not open the app for this account: show the matching screen. */
  const blocked = async (e: unknown) => {
    const tt = t()
    const code = api.accessCode(e)
    if (code === "not_registered") return toDetails()
    if (code === "email_unverified") return set({ authStep: "verifyEmail", loginBusy: false, loginError: null })
    if (code === "pending") return set({ authStep: "pending", loginBusy: false, loginError: null })
    if (code === "rejected") return set({ authStep: "rejected", loginBusy: false, regNote: (e as Error).message, loginError: null })
    await api.logout()
    const message =
      code === "access_off" ? (e as Error).message || tt.loginNoAccess : e instanceof api.NetworkError ? tt.loginOffline : code === "signed_out" ? tt.sessionExpired : tt.loginGeneric
    set({ loginBusy: false, loginPassword: "", loginError: message, authStep: "login" })
  }

  /** On app start: is this phone still signed in? */
  const boot = async () => {
    try {
      if (!fb.isFirebaseConfigured() || !(await fb.currentUser())) {
        k.leave()
      } else {
        await afterSignIn(await api.bootstrap())
      }
    } catch (e) {
      if (api.isAuthError(e)) {
        await blocked(e)
        if (get().authStep === "login") k.leave()
      } else {
        // Backend unreachable (weak signal, server busy): keep working on the cached copy if this phone was signed in.
        // The connection state is left alone, so the regular refresh keeps trying; the first retry comes soon.
        const me = get().me
        if (me) {
          set({ user: me.role, tab: me.role === "sup" ? "review" : "home" })
          window.setTimeout(() => void sync.pull(), 10_000)
        }
      }
    }
    set({ booting: false, loading: false })
  }

  const logout = async (quiet = false) => {
    set({ sheet: null, drawer: false })
    // Last chance to get unsent work to the server before the session ends.
    if (get().online) await sync.flush()
    sync.cancel()
    pending = null
    await api.logout()
    k.leave()
    set({ loginError: null, loginInfo: null })
    if (!quiet) toast(t().loggedOut, "log-out")
  }

  const signIn = async (how: () => Promise<unknown>) => {
    const tt = t()
    if (!fb.isFirebaseConfigured()) return set({ loginError: tt.loginNotSetUp })
    set({ loginBusy: true, loginError: null, loginInfo: null })
    try {
      await how()
    } catch (e) {
      // Same message for an unknown email and a wrong password: do not reveal which accounts exist.
      set({ loginBusy: false, loginPassword: "", loginError: tt[fb.authErrorKey(e)] })
      return
    }
    try {
      await afterSignIn(await api.bootstrap())
    } catch (e) {
      await blocked(e)
    }
  }

  const validPassword = (p: string) => p.length >= 8 && /[a-z]/i.test(p) && /\d/.test(p)
  const firebaseError = (e: unknown) => {
    const code = (e as { code?: string })?.code
    return code ? t()[fb.authErrorKey(e)] : e instanceof api.NetworkError ? t().loginOffline : e instanceof api.ApiError ? e.message : t().loginGeneric
  }

  /* ---------------- profile ---------------- */

  const saveAvatar = (blob: Blob) => {
    // A newer photo replaces one that is still waiting to upload.
    get().uploads.filter((u) => u.avatar).forEach((u) => mediaStore.remove(u.id))
    set((s) => ({ uploads: s.uploads.filter((u) => !u.avatar) }))
    const item = k.keepFile(blob, { kind: "photo", avatar: true, name: { en: "Profile photo", id: "Foto profil" } })
    set({ avatarItem: item, cam: null, sheet: null })
    toast(t().photoUpdated, "image")
  }

  return {
    enter,
    boot,
    saveAvatar,

    /* ---------- sign-in ---------- */
    setLang: (lang: AppState["lang"]) => set({ lang, sheet: null }),
    setLoginEmail: (loginEmail: string) => set({ loginEmail, loginError: null }),
    setLoginPassword: (loginPassword: string) => set({ loginPassword, loginError: null }),
    setNewPassword: (newPassword: string) => set({ newPassword, loginError: null }),
    setNewPassword2: (newPassword2: string) => set({ newPassword2, loginError: null }),
    setAuthStep: (authStep: AuthStep) => set({ authStep, loginError: null, loginInfo: null }),
    /** Existing users get the Classic layout, new users the step-by-step app. */
    setAccountType: (a: "existing" | "new") => set({ ui: (a === "existing" ? "classic" : "new") as UiVariant }),
    login: async () => {
      const s = get()
      if (s.loginBusy) return
      if (!s.loginEmail.trim() || !s.loginPassword) return set({ loginError: t().loginIncomplete })
      await signIn(() => fb.signInWithPassword(s.loginEmail, s.loginPassword))
    },
    loginWithGoogle: async () => {
      if (get().loginBusy) return
      await signIn(() => fb.signInWithGoogle())
    },
    sendPasswordReset: async () => {
      const s = get()
      const tt = t()
      if (s.loginBusy) return
      if (!s.loginEmail.trim()) return set({ loginError: tt.emailNeeded })
      if (!fb.isFirebaseConfigured()) return set({ loginError: tt.loginNotSetUp })
      set({ loginBusy: true, loginError: null, loginInfo: null })
      try {
        await fb.sendReset(s.loginEmail)
        set({ loginBusy: false, loginInfo: tt.resetSent })
      } catch (e) {
        const key = fb.authErrorKey(e)
        // An unknown email gets the same answer as a known one.
        if (key === "loginFailed") set({ loginBusy: false, loginInfo: tt.resetSent })
        else set({ loginBusy: false, loginError: tt[key] })
      }
    },
    /** First sign-in with the admin's temporary password: choose a new one. */
    saveNewPassword: async () => {
      const s = get()
      const tt = t()
      if (s.loginBusy || !pending) return
      if (!validPassword(s.newPassword)) return set({ loginError: tt.passwordWeak })
      if (s.newPassword !== s.newPassword2) return set({ loginError: tt.pwMismatch })
      set({ loginBusy: true, loginError: null })
      try {
        await fb.changePassword(s.newPassword)
        await api.passwordChanged()
      } catch (e) {
        if ((e as { code?: string })?.code === "auth/requires-recent-login") {
          await logout(true)
          return set({ loginError: tt.sessionExpired })
        }
        return set({ loginBusy: false, loginError: firebaseError(e) })
      }
      const data = { ...pending, person: { ...pending.person, mustChangePassword: false } }
      pending = null
      enter(data)
      toast(tt.pwSaved, "circle-check")
    },
    cancelNewPassword: () => void logout(true),
    logout: () => void logout(),
    switchRole: () => void logout(true),

    /* ---------- Register now ---------- */
    setReg: (key: keyof AppState["reg"], value: string) =>
      set((s) => ({ reg: { ...s.reg, [key]: value, ...(key === "networkId" ? { siteId: "" } : {}) }, loginError: null })),
    /** Step 1: create the account (email + password). */
    registerAccount: async () => {
      const s = get()
      const tt = t()
      if (s.loginBusy) return
      if (!s.reg.name.trim()) return set({ loginError: tt.nameRequired })
      if (!s.loginEmail.trim()) return set({ loginError: tt.emailNeeded })
      if (!validPassword(s.loginPassword)) return set({ loginError: tt.passwordWeak })
      if (s.loginPassword !== s.reg.password2) return set({ loginError: tt.pwMismatch })
      if (!fb.isFirebaseConfigured()) return set({ loginError: tt.loginNotSetUp })
      set({ loginBusy: true, loginError: null })
      try {
        await fb.createAccount(s.loginEmail, s.loginPassword, s.reg.name.trim())
      } catch (e) {
        return set({ loginBusy: false, loginError: firebaseError(e) })
      }
      // The backend accepts a sign-up only from a verified email: wait for the person to open the link.
      set({ loginPassword: "", reg: { ...get().reg, password2: "" }, authStep: "verifyEmail", loginBusy: false, loginInfo: tt.verifySent })
    },
    /** "I've verified": check with Firebase, then go on to the details. */
    confirmVerified: async () => {
      const tt = t()
      if (get().loginBusy) return
      set({ loginBusy: true, loginError: null, loginInfo: null })
      try {
        if (await fb.checkVerified()) return void (await toDetails())
        set({ loginBusy: false, loginError: tt.notVerifiedYet })
      } catch (e) {
        set({ loginBusy: false, loginError: firebaseError(e) })
      }
    },
    resendVerification: async () => {
      const tt = t()
      try {
        await fb.resendVerification()
        set({ loginInfo: tt.verifySent, loginError: null })
      } catch (e) {
        set({ loginError: firebaseError(e) })
      }
    },
    /** Register with Google: sign in, then fill in the details. */
    registerWithGoogle: async () => {
      if (get().loginBusy) return
      await signIn(() => fb.signInWithGoogle())
    },
    /** Step 2: send the details; an admin approves. */
    submitRegistration: async () => {
      const s = get()
      const tt = t()
      if (s.loginBusy) return
      const r = s.reg
      if (!r.name.trim()) return set({ loginError: tt.nameRequired })
      if (r.phone.replace(/\D/g, "").length < 8) return set({ loginError: tt.phoneRequired })
      if (!r.role) return set({ loginError: tt.roleNeeded })
      if (!r.siteId) return set({ loginError: tt.siteNeeded })
      set({ loginBusy: true, loginError: null })
      try {
        await api.register({ name: r.name.trim(), phone: r.phone.trim(), village: r.village.trim(), role: r.role, siteId: r.siteId })
        set({ authStep: "pending", loginBusy: false })
      } catch (e) {
        set({ loginBusy: false, loginError: firebaseError(e) })
      }
    },
    /** Waiting for approval: ask the backend again. */
    checkApproval: async () => {
      if (get().loginBusy) return
      set({ loginBusy: true, loginError: null })
      try {
        await afterSignIn(await api.bootstrap())
      } catch (e) {
        await blocked(e)
        if (get().authStep === "pending") {
          set({ loginInfo: t().stillPending })
        }
      }
    },
    applyAgain: () => void toDetails(),

    /* ---------- site ---------- */
    /** Work on another of the person's sites: everything reloads for that site. */
    switchSite: async (siteId: string) => {
      const s = get()
      set({ sheet: null, drawer: false })
      if (!s.me || siteId === s.me.siteId) return
      if (!s.online) return toast(t().noNet, "wifi-off")
      await sync.flush()
      api.setSite(siteId)
      set({ loading: true })
      try {
        sync.apply(await api.bootstrap())
        toast(fill(t().siteSwitched, { s: get().site }), "map-pin")
      } catch (e) {
        api.setSite(s.me.siteId)
        if (api.isAuthError(e)) await blocked(e)
        else toast(t().noNet, "wifi-off")
      }
      set({ loading: false })
    },

    /* ---------- profile ---------- */
    openEditProfile: () => {
      const s = get()
      set({ view: "editProfile", draft: { ...s.profiles[s.user ?? "worker"] }, drawer: false })
    },
    setDraftField: (key: keyof Profile, val: string) => set((s) => ({ draft: s.draft ? { ...s.draft, [key]: val } : s.draft })),
    saveProfile: (valid: boolean) => {
      const s = get()
      if (!valid || !s.draft || !s.user) {
        toast(t().fixFields, "info")
        return
      }
      const d = s.draft
      // The email is the login and stays as the admin set it.
      const clean: Profile = { name: d.name.trim(), phone: d.phone.trim(), village: d.village.trim(), email: s.profiles[s.user].email }
      const role = s.user
      set((st) => ({ profiles: { ...st.profiles, [role]: clean }, view: s.ui === "classic" ? "settings" : null, draft: null }))
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
    pickAvatarFromGallery: (file: File) => void fileToJpeg(file, get().slow).then(saveAvatar),
    removeAvatar: () => {
      get().uploads.filter((u) => u.avatar).forEach((u) => mediaStore.remove(u.id))
      set((s) => ({ sheet: null, avatarItem: null, uploads: s.uploads.filter((u) => !u.avatar) }))
      queue({ id: rid(), kind: "avatar", mediaId: null })
    },

    /* ---------- site setup ---------- */
    openSetupList: (setupIdx: number) => set({ view: "setupList", setupIdx, drawer: false }),
    openAdd: (key: string, ret: AddFormState["ret"] = null) =>
      set({ addForm: { key, vals: {}, ret }, view: "setupAdd" }),
    setAddValue: (key: string, val: string) =>
      set((s) => (s.addForm ? { addForm: { ...s.addForm, vals: { ...s.addForm.vals, [key]: val } } } : {})),
    saveAdd: () => {
      const s = get()
      const a = s.addForm
      if (!a) return
      const tt = t()
      const fields = SETUP_FORMS[a.key]
      const vals = fields.map((f) => String(a.vals[f.k] ?? "").trim())
      const miss = fields.find((f, i) => (i === 0 || f.req) && !vals[i])
      if (miss) return toast(fill(tt.fieldNeeded, { f: L(miss.label, s.lang).toLowerCase() }), "info")
      if (!s.online && (a.key === "kilns" || a.key === "bioref")) return toast(tt.needsOnline, "wifi-off")
      const f2 = fields[1]
      // The backend reads numbers from `sub` (kiln litres, container litres, bulk density).
      const sub = f2 ? vals[1] : ""
      const name = vals[0]
      const ret = a.ret
      const request = a.key === "kilns" || a.key === "bioref"
      // Temporary id until the backend has saved the item and returns its own.
      const tempId = "t-" + rid()
      const shown = f2?.unit && sub ? `${sub} ${f2.unit}` : sub
      set((st) => ({
        setup: st.setup.map((c) => (c.key === a.key ? { ...c, items: [...c.items, { id: tempId, name, sub: shown, pending: request }] } : c)),
        addForm: null,
        // Back to where "add" was opened: a Classic form (bid "form"), the wizard, or the list.
        view: ret ? (ret.bid === "form" ? "recordForm" : "wizard") : "setupList",
      }))
      queue({ id: rid(), kind: "setupAdd", tempId, category: a.key, name, detail: sub })
      // A requested kiln cannot be used until the admin approves it.
      if (ret && !request) {
        if (ret.bid === "form") set((st) => (st.recordForm ? { recordForm: { ...st.recordForm, data: { ...st.recordForm.data, [ret.k]: name } } } : {}))
        else k.setVal(ret.bid, ret.k, name)
      }
      toast(request ? tt.requestSent : fill(tt.addedItem, { n: name }), request ? "send" : "circle-check")
    },
    removeSetupItem: (key: string, id: string) => {
      const item = get().setup.find((c) => c.key === key)?.items.find((i) => i.id === id)
      if (item?.pending) return toast(t().waitingAdmin, "hourglass")
      const unsent = get().outbox.find((o) => o.kind === "setupAdd" && o.tempId === id)
      set((s) => ({
        setup: s.setup.map((c) => (c.key === key ? { ...c, items: c.items.filter((i) => i.id !== id) } : c)),
        outbox: unsent ? s.outbox.filter((o) => o.id !== unsent.id) : s.outbox,
      }))
      if (!unsent && !id.startsWith("t-")) queue({ id: rid(), kind: "setupRemove", category: key, remoteId: id })
      toast(t().removed, "trash-2")
    },

    /* ---------- account deletion & links ---------- */
    /** Delete the account (Google Play requires it): the backend erases the sign-in and personal details. */
    deleteAccount: async () => {
      const tt = t()
      const s = get()
      if (s.loginBusy) return
      if (!s.online) return toast(tt.noNet, "wifi-off")
      set({ loginBusy: true })
      try {
        await api.deleteAccount()
      } catch (e) {
        set({ loginBusy: false })
        return toast(api.errorMessage(e, tt.deleteFailed, tt.noNet), "triangle-alert")
      }
      // Nothing of this account stays on the phone, not even unsent work.
      sync.cancel()
      mediaStore.clear()
      await api.logout()
      set({ ...createEmptyData(s.ui), dirty: [], uploads: [], outbox: [], pendingRecords: [] })
      k.leave()
      set({ loginBusy: false, sheet: null })
      toast(tt.accountDeleted, "circle-check")
    },
    /** Open one of the backend's public pages (privacy policy, terms, account deletion) in the browser. */
    openLink: (kind: "privacy" | "terms" | "deletion") => {
      const s = get().settings
      const url = kind === "privacy" ? s?.privacyUrl : kind === "terms" ? s?.termsUrl : s?.deletionUrl
      window.open(url || `${api.API_URL}/${kind === "deletion" ? "account-deletion" : kind}`, "_blank", "noopener")
    },

    /* ---------- people ---------- */
    callPhone: (name: string, phone: string) => {
      if (!callPhone(phone)) toast(fill(t().noPhone, { n: name }), "phone")
    },
    callSupport: () => {
      const phone = get().rules?.supportPhone ?? ""
      if (!callPhone(phone)) toast(t().noSupport, "info")
    },

    /* ---------- credits ---------- */
    sendSellRequest: () => {
      queue({ id: rid(), kind: "sell" })
      set({ sellStep: "done" })
      // The backend works out the amount; fetch the updated credits once it has the request.
      void sync.flush().then(() => sync.pull())
    },
  }
}
