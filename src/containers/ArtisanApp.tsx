"use client"

import { Icon } from "@/components/common"
import { BottomNav, type NavItem } from "@/components/layout/BottomNav"
import { DeviceFrame } from "@/components/layout/DeviceFrame"
import { Toast } from "@/components/layout/Toast"
import { LoginScreen } from "@/features/auth/LoginScreen"
import { BatchDetailScreen } from "@/features/batches/BatchDetailScreen"
import { ProcessScreen } from "@/features/batches/ProcessScreen"
import { CreditsScreen } from "@/features/credits/CreditsScreen"
import { SellSheet } from "@/features/credits/SellSheet"
import { HomeScreen } from "@/features/home/HomeScreen"
import { EditProfileScreen } from "@/features/profile/EditProfileScreen"
import { LogoutSheet, PhotoSheet } from "@/features/profile/ProfileSheets"
import { ProfileScreen } from "@/features/profile/ProfileScreen"
import { SetupAddScreen, SetupListScreen, SetupScreen, SupervisorsScreen } from "@/features/setup/SetupScreens"
import { SiteSheet } from "@/features/shared/SiteSheet"
import { RejectSheet } from "@/features/supervisor/RejectSheet"
import { ReviewBatchScreen } from "@/features/supervisor/ReviewBatchScreen"
import { ReviewQueueScreen } from "@/features/supervisor/ReviewQueueScreen"
import { ReviewedScreen } from "@/features/supervisor/ReviewedScreen"
import { UploadsScreen } from "@/features/uploads/UploadsScreen"
import { CameraOverlay } from "@/features/wizard/CameraOverlay"
import { CelebrationOverlay } from "@/features/wizard/CelebrationOverlay"
import { StartSheet } from "@/features/wizard/StartSheet"
import { WizardScreen } from "@/features/wizard/WizardScreen"
import { useArtisanStore, type StoreOptions, type Tab } from "@/store/useArtisanStore"
import { createContext, profileInfo } from "./view-models/context"
import {
  buildEditProfile, buildLogin, buildProfile, buildRejectSheet, buildReviewBatch, buildReviewQueue, buildReviewed,
  buildSetup, buildSetupAdd, buildSetupList, buildSiteSheet, buildSupervisors, buildUploads,
} from "./view-models/other"
import { buildCamera, buildCelebration, buildStartOptions, buildWizard } from "./view-models/wizard"
import { buildBatchDetail, buildCredits, buildHome, buildProcess, buildSell } from "./view-models/worker"

/**
 * The one "outer page". It owns all app data (via useArtisanStore), turns it
 * into plain props with the view-model builders, and renders pure feature
 * screens. Feature components never read the store themselves.
 */
export function ArtisanApp(options: StoreOptions) {
  const { state: s, actions: a, t } = useArtisanStore(options)
  const ctx = createContext(s, a, t)

  const isWorker = s.user === "worker"
  const isSup = s.user === "sup"
  const noView = !s.view

  const nav = (key: Tab, icon: NavItem["icon"], label: string): NavItem => ({
    key, icon, label, active: s.tab === key, onSelect: () => a.setTab(key),
  })

  const wizard = buildWizard(ctx)
  const batch = s.view === "batch" ? buildBatchDetail(ctx) : null
  const review = buildReviewBatch(ctx)
  const editProfile = buildEditProfile(ctx)
  const setupAdd = buildSetupAdd(ctx)
  const camera = buildCamera(ctx)
  const celebration = buildCelebration(ctx)
  const me = s.user ? profileInfo(ctx) : null

  return (
    <DeviceFrame online={s.online}>
      <main className="relative min-h-0 flex-1">
        {/* ---- tab screens ---- */}
        {noView && isWorker && s.tab === "home" && <HomeScreen {...buildHome(ctx)} />}
        {noView && isWorker && s.tab === "process" && <ProcessScreen t={t} batches={buildProcess(ctx)} />}
        {noView && isWorker && s.tab === "credits" && <CreditsScreen {...buildCredits(ctx)} />}
        {noView && isSup && s.tab === "review" && <ReviewQueueScreen {...buildReviewQueue(ctx)} />}
        {noView && isSup && s.tab === "history" && <ReviewedScreen t={t} items={buildReviewed(ctx)} />}
        {noView && s.user && s.tab === "profile" && <ProfileScreen {...buildProfile(ctx)} />}

        {/* ---- pushed views ---- */}
        {batch && <BatchDetailScreen {...batch} />}
        {wizard && <WizardScreen t={t} wz={wizard} />}
        {review && <ReviewBatchScreen {...review} />}
        {editProfile && <EditProfileScreen {...editProfile} />}
        {s.view === "uploads" && <UploadsScreen {...buildUploads(ctx)} />}
        {s.view === "setup" && <SetupScreen {...buildSetup(ctx)} />}
        {s.view === "setupList" && <SetupListScreen {...buildSetupList(ctx)} />}
        {setupAdd && <SetupAddScreen {...setupAdd} />}
        {s.view === "sups" && <SupervisorsScreen {...buildSupervisors(ctx)} />}
      </main>

      {noView && isWorker && (
        <BottomNav
          items={[
            nav("home", "house", t.home),
            nav("process", "list-checks", t.process),
            nav("credits", "coins", t.credits),
            nav("profile", "user-round", t.profile),
          ]}
          center={{ label: t.start, onPress: () => a.openSheet("start") }}
        />
      )}
      {noView && isSup && (
        <BottomNav
          items={[
            nav("review", "clipboard-check", t.review),
            nav("history", "history", t.history2),
            nav("profile", "user-round", t.profile),
          ]}
        />
      )}

      {/* ---- sheets ---- */}
      <StartSheet open={s.sheet === "start"} title={t.startTitle} options={buildStartOptions(ctx)} onClose={a.closeSheet} />
      <SiteSheet {...buildSiteSheet(ctx)} />
      <SellSheet {...buildSell(ctx)} />
      <PhotoSheet
        t={t}
        open={s.sheet === "photo"}
        hasPhoto={!!me?.photo}
        onTake={a.takeAvatarPhoto}
        onGallery={a.pickAvatarFromGallery}
        onRemove={a.removeAvatar}
        onClose={a.closeSheet}
      />
      <RejectSheet {...buildRejectSheet(ctx)} />
      <LogoutSheet t={t} open={s.sheet === "logout"} onConfirm={a.logout} onClose={a.closeSheet} />

      {/* ---- full-screen overlays ---- */}
      {camera && <CameraOverlay t={t} cam={camera} />}
      {celebration && <CelebrationOverlay t={t} cel={celebration} />}
      {s.booting ? (
        // Checking with the backend whether this phone is still signed in.
        <div className="absolute inset-0 z-80 flex flex-col items-center justify-center gap-4 bg-brand text-white">
          <div className="flex size-16 items-center justify-center rounded-[20px] bg-lime text-brand-dark">
            <Icon name="leaf" size={34} />
          </div>
          <Icon name="loader-circle" size={26} className="animate-spin text-brand-mist" />
        </div>
      ) : (
        !s.user && <LoginScreen {...buildLogin(ctx)} />
      )}
      {s.toast && <Toast key={s.toast.k} msg={s.toast.msg} icon={s.toast.icon} raised={!!s.user && noView} />}
    </DeviceFrame>
  )
}
