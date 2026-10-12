"use client"

import { useState, type ReactNode } from "react"
import { FieldLabel, Icon, Segmented, type IconName } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Dict } from "@/data/i18n"
import type { Lang } from "@/types"

type Step = "login" | "forgot" | "setPassword" | "register" | "verifyEmail" | "registerDetails" | "pending" | "rejected"
type RegKey = "name" | "phone" | "village" | "role" | "networkId" | "siteId" | "password2"
interface Option {
  value: string
  label: string
}

export interface RegisterProps {
  name: string
  password2: string
  phone: string
  village: string
  role: string
  networkId: string
  siteId: string
  /** Choices from the backend. */
  roles: Option[]
  networks: Option[]
  sites: Option[]
  loadingOptions: boolean
  /** Why a sign-up was not approved (from the admin). */
  note: string
  onChange: (key: RegKey, value: string) => void
  onCreateAccount: () => void
  onGoogle: () => void
  onSubmit: () => void
  onCheck: () => void
  onApplyAgain: () => void
  onLogout: () => void
  /** Email verification after creating the account. */
  onConfirmVerified: () => void
  onResend: () => void
}

export interface LoginScreenProps {
  t: Dict
  lang: Lang
  onLangChange: (l: Lang) => void
  /** Existing users get the Classic layout, new users the step-by-step app. */
  accountType: "existing" | "new"
  onAccountTypeChange: (a: "existing" | "new") => void
  /**
   * login · forgot (reset link) · setPassword (replace the admin's temporary password) · register (create the
   * account) · registerDetails (who and where) · pending (waiting for the admin) · rejected
   */
  step: Step
  onStepChange: (s: Step) => void
  email: string
  onEmailChange: (v: string) => void
  password: string
  onPasswordChange: (v: string) => void
  newPassword: string
  onNewPasswordChange: (v: string) => void
  newPassword2: string
  onNewPassword2Change: (v: string) => void
  showGoogle: boolean
  error: string | null
  info: string | null
  busy: boolean
  onLogin: () => void
  onGoogle: () => void
  onSendReset: () => void
  onSavePassword: () => void
  onCancelPassword: () => void
  register: RegisterProps
  /** The backend's public pages. */
  onPrivacy: () => void
  onTerms: () => void
}

function TextField(props: {
  icon: IconName
  label: string
  type: "email" | "password" | "text" | "tel"
  value: string
  onChange: (v: string) => void
  autoComplete: string
  placeholder?: string
  trailing?: ReactNode
}) {
  return (
    <label className="flex h-[60px] items-center gap-2.5 rounded-2xl border-2 border-line-strong bg-surface px-4 focus-within:border-green">
      <Icon name={props.icon} size={20} className="flex-none text-ink-muted" />
      <Input
        type={props.type}
        inputMode={props.type === "email" ? "email" : props.type === "tel" ? "tel" : undefined}
        autoComplete={props.autoComplete}
        autoCapitalize={props.type === "text" ? "words" : "none"}
        spellCheck={false}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="text-[18px] font-bold"
        aria-label={props.label}
      />
      {props.trailing}
    </label>
  )
}

/** The phone's own picker (works well on Android/iOS), styled like the text fields. */
function SelectField(props: { icon: IconName; label: string; value: string; options: Option[]; placeholder: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="relative flex h-[60px] items-center gap-2.5 rounded-2xl border-2 border-line-strong bg-surface px-4 focus-within:border-green">
      <Icon name={props.icon} size={20} className="flex-none text-ink-muted" />
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        aria-label={props.label}
        className="h-full min-w-0 flex-1 appearance-none bg-transparent text-[18px] font-bold outline-none disabled:opacity-50"
      >
        <option value="">{props.placeholder}</option>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" size={20} className="pointer-events-none flex-none text-ink-muted" />
    </label>
  )
}

function PasswordField(props: { t: Dict; label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [shown, setShown] = useState(false)
  return (
    <TextField
      icon="lock"
      label={props.label}
      type={shown ? "text" : "password"}
      value={props.value}
      onChange={props.onChange}
      autoComplete={props.autoComplete}
      trailing={
        <button
          type="button"
          onClick={() => setShown((x) => !x)}
          className="-mr-1 flex size-10 flex-none items-center justify-center rounded-xl text-ink-muted"
          aria-label={shown ? props.t.hidePw : props.t.showPw}
        >
          <Icon name={shown ? "eye-off" : "eye"} size={20} />
        </button>
      }
    />
  )
}

/** Google's "G" mark, as required on a Google sign-in button. */
const GoogleMark = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
)

function Notice({ tone, children }: { tone: "danger" | "info"; children: ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={
        tone === "danger"
          ? "flex items-center gap-2 rounded-2xl bg-danger-soft px-3.5 py-3 text-[15px] font-bold text-danger"
          : "flex items-center gap-2 rounded-2xl bg-surface px-3.5 py-3 text-[15px] font-bold text-green"
      }
    >
      <Icon name={tone === "danger" ? "triangle-alert" : "info"} size={18} className="flex-none" />
      {children}
    </div>
  )
}

const Spinner = () => <Icon name="loader-circle" size={22} className="animate-spin" />

function Primary({ busy, label, icon }: { busy: boolean; label: string; icon: IconName }) {
  return (
    <Button type="submit" size="xl" className="mt-2.5" disabled={busy}>
      {busy ? (
        <Spinner />
      ) : (
        <>
          {label}
          <Icon name={icon} size={22} />
        </>
      )}
    </Button>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold text-ink-muted">
      <span className="h-px flex-1 bg-line-strong" />
      {label}
      <span className="h-px flex-1 bg-line-strong" />
    </div>
  )
}

function Heading({ icon, title, sub }: { icon?: IconName; title: string; sub: string }) {
  return (
    <>
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-2xl bg-surface text-green">
          <Icon name={icon} size={24} />
        </div>
      )}
      <div className="text-[22px] font-extrabold tracking-[-.4px]">{title}</div>
      <p className="text-[15px] text-ink-muted">{sub}</p>
    </>
  )
}

export function LoginScreen(p: LoginScreenProps) {
  const { t } = p
  const r = p.register
  const submit = {
    login: p.onLogin,
    forgot: p.onSendReset,
    setPassword: p.onSavePassword,
    register: r.onCreateAccount,
    verifyEmail: r.onConfirmVerified,
    registerDetails: r.onSubmit,
    pending: r.onCheck,
    rejected: r.onApplyAgain,
  }[p.step]
  const back = (
    <Button type="button" size="xl" variant="neutral" onClick={() => p.onStepChange("login")} disabled={p.busy}>
      <Icon name="arrow-left" size={20} />
      {t.backToLogin}
    </Button>
  )
  const logout = (
    <Button type="button" size="xl" variant="neutral" onClick={r.onLogout} disabled={p.busy}>
      <Icon name="log-out" size={20} />
      {t.logout}
    </Button>
  )
  return (
    <form
      className="absolute inset-0 z-80 flex animate-fade-in flex-col overflow-y-auto bg-cream no-scrollbar"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <header className="flex flex-none flex-col gap-3 rounded-b-[32px] bg-brand px-6 pt-[52px] pb-7 text-white">
        <div className="flex items-center justify-between">
          <div className="flex size-14 items-center justify-center rounded-[18px] bg-lime text-brand-dark">
            <Icon name="leaf" size={30} />
          </div>
          <Segmented
            variant="dark"
            value={p.lang}
            onChange={p.onLangChange}
            itemClassName="h-[38px] min-w-[50px] text-sm"
            options={[
              { value: "en", label: "EN" },
              { value: "id", label: "ID" },
            ]}
          />
        </div>
        <div className="mt-2 text-[32px] font-extrabold tracking-[-.8px]">Artisan Pro</div>
        <div className="text-[17px] text-brand-mist">{t.tagline}</div>
      </header>

      <div className="flex flex-col gap-3 px-6 pt-[22px] pb-[30px]">
        {p.step === "login" && (
          <>
            <FieldLabel className="text-[15px]">{t.accountLbl}</FieldLabel>
            <Segmented
              variant="raised"
              value={p.accountType}
              onChange={p.onAccountTypeChange}
              className="rounded-2xl"
              itemClassName="min-h-[60px] flex-1 gap-0.5 rounded-xl text-base"
              options={[
                { value: "existing", label: t.existingU, sub: t.existingSub },
                { value: "new", label: t.newU, sub: t.newSub },
              ]}
            />

            <FieldLabel className="mt-1.5 text-[15px]">{t.emailLbl}</FieldLabel>
            <TextField icon="mail" label={t.emailLbl} type="email" value={p.email} onChange={p.onEmailChange} autoComplete="username" placeholder="name@email.com" />

            <div className="mt-1.5 flex items-center justify-between">
              <FieldLabel className="text-[15px]">{t.passwordLbl}</FieldLabel>
              <button type="button" onClick={() => p.onStepChange("forgot")} className="text-[15px] font-extrabold text-green">
                {t.forgotPw}
              </button>
            </div>
            <PasswordField t={t} label={t.passwordLbl} value={p.password} onChange={p.onPasswordChange} autoComplete="current-password" />

            {p.error && <Notice tone="danger">{p.error}</Notice>}
            <Primary busy={p.busy} label={t.login} icon="arrow-right" />

            {p.showGoogle && (
              <>
                <Divider label={t.orWord} />
                <Button type="button" size="xl" variant="neutral" className="gap-3" disabled={p.busy} onClick={p.onGoogle}>
                  <GoogleMark />
                  {t.googleLogin}
                </Button>
              </>
            )}
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[15px]">
              <span className="text-ink-muted">{t.newHere}</span>
              <button type="button" onClick={() => p.onStepChange("register")} className="font-extrabold text-green">
                {t.registerNow}
              </button>
            </div>
            <p className="text-center text-sm text-ink-muted">{t.demoPin}</p>
          </>
        )}

        {p.step === "forgot" && (
          <>
            <Heading title={t.forgotTitle} sub={t.forgotSub} />
            <FieldLabel className="mt-1.5 text-[15px]">{t.emailLbl}</FieldLabel>
            <TextField icon="mail" label={t.emailLbl} type="email" value={p.email} onChange={p.onEmailChange} autoComplete="username" placeholder="name@email.com" />
            {p.error && <Notice tone="danger">{p.error}</Notice>}
            {p.info && <Notice tone="info">{p.info}</Notice>}
            <Primary busy={p.busy} label={t.sendLink} icon="send" />
            {back}
          </>
        )}

        {p.step === "setPassword" && (
          <>
            <Heading icon="key-round" title={t.setPwTitle} sub={t.setPwSub} />
            <FieldLabel className="mt-1.5 text-[15px]">{t.newPw}</FieldLabel>
            <PasswordField t={t} label={t.newPw} value={p.newPassword} onChange={p.onNewPasswordChange} autoComplete="new-password" />
            <FieldLabel className="mt-1.5 text-[15px]">{t.confirmPw}</FieldLabel>
            <PasswordField t={t} label={t.confirmPw} value={p.newPassword2} onChange={p.onNewPassword2Change} autoComplete="new-password" />
            <p className="text-sm text-ink-muted">{t.pwRule}</p>
            {p.error && <Notice tone="danger">{p.error}</Notice>}
            <Primary busy={p.busy} label={t.savePw} icon="check" />
            {logout}
          </>
        )}

        {p.step === "register" && (
          <>
            <Heading icon="user-round" title={t.registerTitle} sub={t.registerSub} />
            <FieldLabel className="mt-1.5 text-[15px]">{t.fullName}</FieldLabel>
            <TextField icon="user-round" label={t.fullName} type="text" value={r.name} onChange={(v) => r.onChange("name", v)} autoComplete="name" placeholder="Pak / Ibu …" />
            <FieldLabel className="mt-1.5 text-[15px]">{t.emailLbl}</FieldLabel>
            <TextField icon="mail" label={t.emailLbl} type="email" value={p.email} onChange={p.onEmailChange} autoComplete="email" placeholder="name@email.com" />
            <FieldLabel className="mt-1.5 text-[15px]">{t.passwordLbl}</FieldLabel>
            <PasswordField t={t} label={t.passwordLbl} value={p.password} onChange={p.onPasswordChange} autoComplete="new-password" />
            <FieldLabel className="mt-1.5 text-[15px]">{t.confirmPw}</FieldLabel>
            <PasswordField t={t} label={t.confirmPw} value={r.password2} onChange={(v) => r.onChange("password2", v)} autoComplete="new-password" />
            <p className="text-sm text-ink-muted">{t.pwRule}</p>
            {p.error && <Notice tone="danger">{p.error}</Notice>}
            <Primary busy={p.busy} label={t.continueW} icon="arrow-right" />
            {p.showGoogle && (
              <>
                <Divider label={t.orWord} />
                <Button type="button" size="xl" variant="neutral" className="gap-3" disabled={p.busy} onClick={r.onGoogle}>
                  <GoogleMark />
                  {t.registerGoogle}
                </Button>
              </>
            )}
            <button type="button" onClick={() => p.onStepChange("login")} className="mt-1 text-center text-[15px] font-extrabold text-green">
              {t.haveAccount}
            </button>
          </>
        )}

        {p.step === "verifyEmail" && (
          <>
            <Heading icon="mail" title={t.verifyTitle} sub={t.verifySub} />
            {p.email && <div className="rounded-2xl bg-surface px-4 py-3 text-[17px] font-bold">{p.email}</div>}
            {p.error && <Notice tone="danger">{p.error}</Notice>}
            {p.info && <Notice tone="info">{p.info}</Notice>}
            <Primary busy={p.busy} label={t.iVerified} icon="check" />
            <Button type="button" size="xl" variant="neutral" onClick={r.onResend} disabled={p.busy}>
              <Icon name="send" size={20} />
              {t.resendLink}
            </Button>
            {logout}
          </>
        )}

        {p.step === "registerDetails" && (
          <>
            <Heading icon="id-card" title={t.detailsTitle} sub={t.detailsSub} />
            <FieldLabel className="mt-1.5 text-[15px]">{t.fullName}</FieldLabel>
            <TextField icon="user-round" label={t.fullName} type="text" value={r.name} onChange={(v) => r.onChange("name", v)} autoComplete="name" />
            <FieldLabel className="mt-1.5 text-[15px]">{t.phoneLbl}</FieldLabel>
            <TextField icon="phone" label={t.phoneLbl} type="tel" value={r.phone} onChange={(v) => r.onChange("phone", v)} autoComplete="tel" placeholder="+62 …" />
            <FieldLabel className="mt-1.5 text-[15px]">{t.village}</FieldLabel>
            <TextField icon="house" label={t.village} type="text" value={r.village} onChange={(v) => r.onChange("village", v)} autoComplete="address-level2" placeholder={t.villagePh} />
            <FieldLabel className="mt-1.5 text-[15px]">{t.roleQ}</FieldLabel>
            <SelectField icon="id-card" label={t.roleQ} value={r.role} options={r.roles} placeholder={r.loadingOptions ? t.loadingMore : t.roleQ} onChange={(v) => r.onChange("role", v)} />
            <FieldLabel className="mt-1.5 text-[15px]">{t.networkLbl}</FieldLabel>
            <SelectField icon="building-2" label={t.networkLbl} value={r.networkId} options={r.networks} placeholder={r.loadingOptions ? t.loadingMore : t.selectNetwork} onChange={(v) => r.onChange("networkId", v)} />
            <FieldLabel className="mt-1.5 text-[15px]">{t.siteLbl}</FieldLabel>
            <SelectField icon="map-pin" label={t.siteLbl} value={r.siteId} options={r.sites} placeholder={t.selectSite} onChange={(v) => r.onChange("siteId", v)} disabled={!r.networkId} />
            {p.error && <Notice tone="danger">{p.error}</Notice>}
            <Primary busy={p.busy} label={t.sendForApproval} icon="send" />
            {logout}
          </>
        )}

        {p.step === "pending" && (
          <>
            <Heading icon="hourglass" title={t.pendingTitle} sub={t.pendingSub} />
            {p.error && <Notice tone="danger">{p.error}</Notice>}
            {p.info && <Notice tone="info">{p.info}</Notice>}
            <Primary busy={p.busy} label={t.checkAgain} icon="rotate-ccw" />
            {logout}
          </>
        )}

        {p.step === "rejected" && (
          <>
            <Heading icon="circle-x" title={t.rejectedTitle} sub={r.note} />
            {p.error && <Notice tone="danger">{p.error}</Notice>}
            <Primary busy={p.busy} label={t.applyAgain} icon="send" />
            {logout}
          </>
        )}
        <div className="mt-3 flex justify-center gap-5 text-sm font-bold text-ink-muted">
          <button type="button" onClick={p.onPrivacy} className="cursor-pointer underline-offset-2 hover:underline">
            {t.privacyPolicy}
          </button>
          <button type="button" onClick={p.onTerms} className="cursor-pointer underline-offset-2 hover:underline">
            {t.termsOfUse}
          </button>
        </div>
      </div>
    </form>
  )
}
