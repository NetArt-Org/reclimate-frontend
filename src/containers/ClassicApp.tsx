"use client"

import { DeviceFrame } from "@/components/layout/DeviceFrame"
import { Toast } from "@/components/layout/Toast"
import { ClassicForm, ClassicSheets, SourcePick } from "@/features/classic/forms"
import { ClassicEditProfile, ClassicSetup, ClassicSetupAdd, ClassicSetupList, ClassicSupervisors, ClassicUploads } from "@/features/classic/more"
import {
  ClassicBiomass, ClassicDistribution, ClassicDrawer, ClassicHome, ClassicMixing, ClassicProduction, ClassicSettings,
} from "@/features/classic/screens"
import { ClassicBottomNav, ClassicHeader, ClassicScreen } from "@/features/classic/ui"
import { DeleteAccountSheet, LogoutSheet, PhotoSheet } from "@/features/profile/ProfileSheets"
import { SiteSheet } from "@/features/shared/SiteSheet"
import { RejectSheet } from "@/features/supervisor/RejectSheet"
import { CameraOverlay } from "@/features/wizard/CameraOverlay"
import type { ArtisanStore } from "@/store/useArtisanStore"
import {
  buildClassicBiomass, buildClassicDistribution, buildClassicDrawer, buildClassicForm, buildClassicHome, buildClassicMixing,
  buildClassicProduction, buildClassicSettings, buildClassicSheets, buildClassicShell, buildSourcePick,
} from "./view-models/classic"
import { createContext, profileInfo } from "./view-models/context"
import {
  buildEditProfile, buildRejectSheet, buildSetup, buildSetupAdd, buildSetupList, buildSiteSheet, buildSupervisors, buildUploads,
} from "./view-models/other"
import { buildCamera } from "./view-models/wizard"

/**
 * The Classic app (existing users): the Circonomy field app's layout — five tabs (Home, Biomass Collection,
 * Production, Mixing & Packing, Distribution), a side drawer and add-record forms. It gets all app data from the
 * main page (app/page.tsx) as a prop and shows the same backend records as the step-by-step app.
 */
export function ClassicApp({ store }: { store: ArtisanStore }) {
  const { state: s, actions: a, t } = store
  const ctx = createContext(s, a, t)
  const shell = buildClassicShell(ctx)
  const form = buildClassicForm(ctx)
  const pick = buildSourcePick(ctx)
  const editProfile = buildEditProfile(ctx)
  const setupAdd = buildSetupAdd(ctx)
  const camera = buildCamera(ctx)
  const me = profileInfo(ctx)
  const noView = !s.view

  return (
    <DeviceFrame online={s.online}>
      <main className="relative min-h-0 flex-1 bg-cl-bg">
        {noView && (
          <ClassicScreen>
            <ClassicHeader {...shell.header} />
            {s.cTab === "home" && <ClassicHome {...buildClassicHome(ctx)} />}
            {s.cTab === "biomass" && <ClassicBiomass {...buildClassicBiomass(ctx)} />}
            {s.cTab === "production" && <ClassicProduction {...buildClassicProduction(ctx)} />}
            {s.cTab === "mixing" && <ClassicMixing {...buildClassicMixing(ctx)} />}
            {s.cTab === "distribution" && <ClassicDistribution {...buildClassicDistribution(ctx)} />}
          </ClassicScreen>
        )}

        {/* ---- pushed views ---- */}
        {s.view === "settings" && <ClassicSettings {...buildClassicSettings(ctx)} />}
        {pick && <SourcePick {...pick} />}
        {form && <ClassicForm {...form} />}
        {editProfile && <ClassicEditProfile {...editProfile} />}
        {s.view === "uploads" && <ClassicUploads {...buildUploads(ctx)} />}
        {s.view === "setup" && <ClassicSetup {...buildSetup(ctx)} />}
        {s.view === "setupList" && <ClassicSetupList {...buildSetupList(ctx)} />}
        {setupAdd && <ClassicSetupAdd {...setupAdd} />}
        {s.view === "sups" && <ClassicSupervisors {...buildSupervisors(ctx)} />}
      </main>

      {noView && <ClassicBottomNav items={shell.nav} />}
      <ClassicDrawer {...buildClassicDrawer(ctx)} />

      {/* ---- sheets ---- */}
      <SiteSheet {...buildSiteSheet(ctx)} />
      <ClassicSheets {...buildClassicSheets(ctx)} />
      <RejectSheet {...buildRejectSheet(ctx)} />
      <PhotoSheet
        t={t}
        open={s.sheet === "photo"}
        hasPhoto={!!me.photo}
        onTake={a.takeAvatarPhoto}
        onGallery={a.pickAvatarFromGallery}
        onRemove={a.removeAvatar}
        onClose={a.closeSheet}
      />
      <LogoutSheet t={t} open={s.sheet === "logout"} onConfirm={a.logout} onClose={a.closeSheet} />
      <DeleteAccountSheet t={t} open={s.sheet === "deleteAccount"} busy={s.loginBusy} onConfirm={() => void a.deleteAccount()} onClose={a.closeSheet} />

      {camera && <CameraOverlay t={t} cam={camera} />}
      {s.toast && <Toast key={s.toast.k} msg={s.toast.msg} icon={s.toast.icon} raised={noView} />}
    </DeviceFrame>
  )
}
