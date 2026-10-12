"use client"

import { useSyncExternalStore } from "react"

import { UpdateRequired } from "@/components/layout/UpdateRequired"
import { ArtisanApp } from "@/containers/ArtisanApp"
import { ClassicApp } from "@/containers/ClassicApp"
import { isUpdateRequired, onUpdateRequired } from "@/lib/api"
import { APP_VERSION } from "@/lib/native"
import { useArtisanStore } from "@/store/useArtisanStore"

/** "2.6.3" < "2.7.0" */
const versionLess = (a: string, b: string) => {
  const pa = a.split(".").map(Number)
  const pb = b.split(".").map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d) return d < 0
  }
  return false
}

/**
 * The main page: the one place app data enters. It holds the store (state + actions, kept in step with the
 * backend — the single source of truth) and passes it as props to the layout this phone uses. Existing users get
 * the Classic layout, new users the step-by-step app; both show the same backend data.
 * A build older than the backend's minimum version only shows "Update the app".
 */
export default function Page() {
  const store = useArtisanStore()
  const refused = useSyncExternalStore(onUpdateRequired, isUpdateRequired, () => false)
  const { settings, lang } = store.state
  const tooOld = !!settings?.minAppVersion && versionLess(APP_VERSION, settings.minAppVersion)
  if (refused || tooOld) return <UpdateRequired lang={lang} storeUrl={settings?.storeUrl} />
  if (store.state.user && store.state.ui === "classic") return <ClassicApp store={store} />
  return <ArtisanApp store={store} />
}
