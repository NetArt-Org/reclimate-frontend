# Artisan Pro · Reclimate dMRV

Web + mobile app for biochar dMRV, in two layouts over the same backend data:

- **New users — the step-by-step app**: artisans record each batch over 4 days (collect → burn → mix & pack →
  give & apply) with guided photos; supervisors review, accept or reject.
- **Existing users — the Classic app**: the Circonomy field app's layout — Home (site summary), Biomass
  Collection, Production, Mixing & Packing and Distribution tabs, a side drawer and add-record forms.

The choice is made on the login screen ("Existing user / New user") and can be changed in the profile/settings.
English + Bahasa Indonesia (app labels only; data is shown as the backend stores it).

Stack: **Next.js 16 (App Router, static export)** · **Tailwind CSS v4** · **shadcn/ui (Radix)** ·
**lucide-react** · **Firebase Auth** · **Capacitor 8** for Android/iOS.

## Run

The app needs the backend (`../backend-reclimate-dmrv`, Payload CMS + Neon) running — see its README.

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL (the backend) + NEXT_PUBLIC_FIREBASE_* (public web config)
npm install
npm run dev          # http://localhost:3000 — shows the phone frame on desktop, full-screen on phones
npm run build        # static export → out/
npm run lint && npm run typecheck
```

**Signing in.** Email + password, "Continue with Google" (web), and "Forgot password?" (Firebase reset email).
Logins come two ways:
- an admin creates one (backend → Networks & people → person → App login) and hands over a temporary password;
  the app asks for a new password on first sign-in;
- **Register now**: the person creates an account in the app, fills in their details (phone, village, role,
  network and site) and waits — the admin approves or rejects the request in the backend's Action Center.

## Mobile (Capacitor)

The native apps wrap the static export in `out/`.

```bash
npm run cap:android  # build, sync, open Android Studio
npm run cap:ios      # build, sync, open Xcode
npm run cap:sync     # build + copy web assets into both native projects
```

Because the app ships as static files, **server-only Next.js features are not available**
(API routes, server actions, middleware, `cookies()`, image optimization). Everything goes through the
backend's field API from the client (`src/lib/api`).

Phone features use Capacitor plugins, so permissions are asked properly on Android and iOS: location
(`@capacitor/geolocation`), the phone model reported with the app version (`@capacitor/device`), and the Android
back button and app resume (`@capacitor/app`). The camera uses the webview's camera (falls back to the system
camera / file picker).

`NEXT_PUBLIC_API_URL` is baked in at build time, so set it before `npm run cap:*`. From a phone,
`localhost` is the phone itself: use `http://10.0.2.2:3001` on the Android emulator and a deployed
HTTPS backend on real devices (Android and iOS block plain `http://` to other hosts by default).
Add the app's origin to the backend's `CORS_ORIGINS` — `capacitor://localhost` (iOS) and
`https://localhost` (Android). The version in `package.json` is sent to the backend with every request
(the admin sees who runs an older app); bump it with each release.

## Architecture

```
src/
  app/page.tsx            THE main page — holds the store and passes it to the layout this phone uses
  containers/
    ArtisanApp.tsx        step-by-step layout (and the shared sign-in screens)
    ClassicApp.tsx        Classic layout
    view-models/          pure functions: store state → screen props (formatted strings + callbacks)
  store/                  state + actions (account, batches, Classic records) · sync: keeps it in step with the backend
  features/               presentational screens, props-only (no store or API access)
    auth/ home/ batches/ credits/ profile/ wizard/ supervisor/ setup/ uploads/ shared/ classic/
  components/             ui/ (shadcn primitives) · common/ (Icon, LoadMore…) · layout/ (DeviceFrame, BottomNav, Toast)
  data/                   wizard wording (days/steps), setup categories, i18n (EN/ID), cached-data shape
  lib/                    api/ (every backend call + types), firebase, native (Capacitor), rules, media-store, format
  types/                  domain types
```

Data flow: backend → `src/lib/api` → `store` (+ `sync`) → `app/page.tsx` → `ArtisanApp` / `ClassicApp` build
props via `view-models/*` → `features/*` render them.

### Backend: the single source of truth

Nothing shown in the app is made up on the phone. The backend sends, per site:

- **rules and limits** set by the admin (Settings → Field app settings): photo and video counts, video length,
  moisture readings and limit, temperature readings and minimum, which quench photos, whether mixing is used,
  open biochar, credit price/currency/payout goal, support phone — applied to the wizard by `src/lib/rules.ts`;
- **lists**: feedstocks (with lab values → credits per litre), mixing types, reject reasons, site setup lists;
- **records**: batches, biomass collections, mixings, packagings, applications/distributions, credits history;
- **site totals** (biochar by status, biomass by feedstock, mixing, packing, 30-day trend).

Long lists come one page at a time ("Load more"); short setup lists load all their pages automatically.

```
src/lib/api/client.ts     fetch wrapper: Firebase ID token, ?site=, app version/device headers
src/lib/api/types.ts      what the backend sends
src/lib/api/mappers.ts    backend shapes ↔ the app's types
src/lib/api/index.ts      one function per endpoint
src/lib/media-store.ts    captured files: IndexedDB until uploaded, object URLs for display
src/store/sync.ts         sends local changes, pulls the server's copy
```

- **Offline first.** Every action changes the local copy, then `sync` sends it: changed batches
  (`dirty`), queued files (`uploads`), other edits (`outbox`) and Classic records made offline
  (`pendingRecords`). It pulls every 30 s, when the app comes back to the foreground and when the connection
  returns — that is how a supervisor's or the admin's decision reaches the worker.
- **Session.** Firebase keeps the sign-in on the device and issues short-lived ID tokens; the app sends one as
  `Authorization: Bearer` with each request and the backend checks it, and the person's app access, every time.
- **Cached data.** `localStorage` holds a copy of the signed-in user's data so the app opens offline.
  It is wiped on logout (unless work is still waiting to upload) and whenever a different account signs in.
- **Media.** Photos and videos are private: the backend only serves them to people at the same site and admins,
  so screens load them with the session and show object URLs. Downloaded photos are kept on the phone (IndexedDB,
  last 300) so they show offline and are not downloaded again.
- **Retries and caching.** Reads, saves and uploads are retried with backoff (and `Retry-After` on 429/503);
  anything that is not safe to repeat is sent once. Records and uploads carry their id on the phone, so a resend
  after a lost reply is not stored twice. The start-up data is polled every 60 s with an ETag (an unchanged copy is a
  304), and a sync that cannot reach the server waits longer each time (up to a minute).
- **Errors** are shown as toasts with the backend's own message (e.g. "already decided by the admin").

### Approvals

- **Batches**: the worker submits → a supervisor accepts or rejects (network review, with a reason from the
  backend's list) → the admin gives the final approval or rejection; the app shows which. A rejected batch goes
  back to the step that captures the evidence again.
- **Sign-ups** (Register now), **new kilns** and **bulk-density changes** asked for in the app, and
  **sell requests** are approved in the backend's Action Center.

Styling: colours are Tailwind tokens in `src/app/globals.css` (`bg-brand`, `text-ink-muted`… and `bg-cl*` for the
Classic layout). Use utility classes inline; add new colours as tokens rather than hex values.

## Release (Android / iOS)

- Icons and splash: `assets/` holds the sources (`node assets/make-icons.mjs` rebuilds them from the app's leaf mark);
  `npx @capacitor/assets generate --android --ios` makes every size (run on demand; not installed, to keep vulnerable build tools out of the project).
- Version: `package.json` → Android `versionName`/`versionCode` (read at build time) and the version the app reports to
  the backend. Set the iOS marketing version in Xcode to match.
- Android: backups are off (`allowBackup="false"`, data extraction rules), release signing reads
  `android/keystore.properties` (git-ignored).
- Google Play: see [docs/play-store.md](docs/play-store.md) (signing, listing, Data safety answers, account deletion).

## Not built yet

- **Google sign-in inside the Android/iOS app** needs the native Firebase plugin and the project's
  `google-services.json` / `GoogleService-Info.plist`; until then the button shows on the web only.
- The camera and GPS have not been run on a real phone yet.
