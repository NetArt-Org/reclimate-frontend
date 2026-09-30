"use client"

import { FieldLabel, Icon, OptionCard, Segmented, type IconName } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Dict } from "@/data/i18n"
import { cn } from "@/lib/utils"
import type { Lang, Role } from "@/types"

export interface LoginScreenProps {
  t: Dict
  lang: Lang
  onLangChange: (l: Lang) => void
  accountType: "existing" | "new"
  onAccountTypeChange: (a: "existing" | "new") => void
  roles: { value: Role; icon: IconName; title: string; sub: string }[]
  role: Role
  onRoleChange: (r: Role) => void
  phone: string
  onPhoneChange: (v: string) => void
  pin: string
  pinLength: number
  onPinChange: (v: string) => void
  error: string | null
  busy: boolean
  onLogin: () => void
}

export function LoginScreen(p: LoginScreenProps) {
  const { t } = p
  return (
    <form
      className="absolute inset-0 z-80 flex animate-fade-in flex-col overflow-y-auto bg-cream no-scrollbar"
      onSubmit={(e) => {
        e.preventDefault()
        p.onLogin()
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

        <FieldLabel className="mt-1.5 text-[15px]">{t.loginAs}</FieldLabel>
        {p.roles.map((r) => (
          <OptionCard
            key={r.value}
            size="lg"
            icon={r.icon}
            title={<span className="font-extrabold">{r.title}</span>}
            sub={r.sub}
            selected={p.role === r.value}
            onClick={() => p.onRoleChange(r.value)}
            className="min-h-[76px]"
          />
        ))}

        <FieldLabel className="mt-1.5 text-[15px]">{t.phoneLbl}</FieldLabel>
        <label className="flex h-[60px] items-center gap-2.5 rounded-2xl border-2 border-line-strong bg-surface px-4 focus-within:border-green">
          <Icon name="phone" size={20} className="text-ink-muted" />
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="username"
            placeholder="+62 …"
            value={p.phone}
            onChange={(e) => p.onPhoneChange(e.target.value)}
            className="text-[19px] font-bold"
            aria-label={t.phoneLbl}
          />
        </label>

        <FieldLabel className="mt-1.5 text-[15px]">PIN</FieldLabel>
        {/* One real (invisible) field sits on top of the boxes, so the keyboard, paste and password managers all work. */}
        <div className="relative flex gap-2.5">
          {Array.from({ length: p.pinLength }, (_, i) => (
            <div
              key={i}
              className={cn(
                "flex h-[60px] flex-1 items-center justify-center rounded-2xl border-2 bg-surface text-[26px]",
                i < p.pin.length ? "border-green" : i === p.pin.length ? "border-brand" : "border-line-strong"
              )}
            >
              {i < p.pin.length ? "•" : ""}
            </div>
          ))}
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={p.pinLength}
            value={p.pin}
            onChange={(e) => p.onPinChange(e.target.value)}
            aria-label="PIN"
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </div>

        {p.error && (
          <div role="alert" className="flex items-center gap-2 rounded-2xl bg-danger-soft px-3.5 py-3 text-[15px] font-bold text-danger">
            <Icon name="triangle-alert" size={18} className="flex-none" />
            {p.error}
          </div>
        )}

        <Button type="submit" size="xl" className="mt-2.5" disabled={p.busy}>
          {p.busy ? (
            <Icon name="loader-circle" size={22} className="animate-spin" />
          ) : (
            <>
              {t.login}
              <Icon name="arrow-right" size={22} />
            </>
          )}
        </Button>
        <p className="text-center text-sm text-ink-muted">{t.demoPin}</p>
      </div>
    </form>
  )
}
