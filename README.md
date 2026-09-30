# Artisan Pro · Reclimate dMRV

Web + mobile app for biochar dMRV: field **artisans** record each batch over 4 days
(collect → burn → mix & pack → give & apply) with guided photos, and **supervisors**
review, accept or reject. English + Bahasa Indonesia.

Stack: **Next.js 16 (App Router, static export)** · **Tailwind CSS v4** · **shadcn/ui (Radix)** ·
**lucide-react** · **Capacitor** for Android/iOS.

## Run

The app needs the backend (`../backend-reclimate-dmrv`, Payload CMS + Neon) running — see its README.

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL → where the backend is reachable
npm install
npm run dev          # http://localhost:3000 — shows the phone frame on desktop, full-screen on phones
npm run build        # static export → out/
npm run lint && npm run typecheck
```

Sign in with a worker's or supervisor's phone number and 4-digit PIN (accounts are created in the
backend's admin panel; `npm run seed` there creates the demo ones).

## Mobile (Capacitor)

The native apps wrap the static export in `out/`.

```bash
npm run cap:android  # build, sync, open Android Studio
npm run cap:ios      # build, sync, open Xcode
npm run cap:sync     # build + copy web assets into both native projects
```

Because the app ships as static files, **server-only Next.js features are not available**
(API routes, server actions, middleware, `cookies()`, image optimization). Everything goes through the
backend's REST API from the client (`src/lib/api`).

`NEXT_PUBLIC_API_URL` is baked in at build time, so set it before `npm run cap:*`. From a phone,
`localhost` is the phone itself: use `http://10.0.2.2:3001` on the Android emulator and a deployed
HTTPS backend on real devices (Android and iOS block plain `http://` to other hosts by default).
Add the app's origin to the backend's `CORS_ORIGINS` — `capacitor://localhost` (iOS) and
`https://localhost` (Android) are already in its example file.

## Architecture

```
src/
  app/                    Next.js entry (layout, fonts, globals.css design tokens, page.tsx)
  containers/
    ArtisanApp.tsx        THE outer page — owns all data, passes props to every screen
    view-models/          pure functions: store state → screen props (formatted strings + callbacks)
  store/                  useArtisanStore: single state + actions · sync: keeps it in step with the backend
  features/               presentational screens, props-only (no store access)
    auth/  home/  batches/  credits/  profile/  wizard/  supervisor/  setup/  uploads/  shared/
  components/
    ui/                   shadcn primitives, restyled to the design (Button, Badge, Card, Sheet, Switch, Input…)
    common/               app-wide building blocks (Icon, IconTile, OptionCard, Segmented, FieldShell…)
    layout/               DeviceFrame, BottomNav, Toast
  data/                   constants (days/steps, setup lists, reasons), i18n (EN/ID), empty cache shape
  lib/                    backend client (api/), captured files, formatting, batch field logic, colour tones
  types/                  domain types
```

Data flow: `useArtisanStore` → `ArtisanApp` builds props via `view-models/*` → `features/*` render them.

### Backend connection

```
src/lib/api/client.ts     fetch wrapper + session (login / me / logout)
src/lib/api/mappers.ts    backend documents ↔ the app's types (the only place that knows both shapes)
src/lib/api/index.ts      one function per endpoint
src/lib/media-store.ts    captured files: IndexedDB until uploaded, object URLs for display
src/store/sync.ts         sends local changes, pulls the server's copy
```

- **Offline first.** Every action changes the local copy, then `sync` sends it: changed batches
  (`dirty`), queued files (`uploads`) and other edits (`outbox`). It pulls every 20 s, when the app
  comes back to the foreground and when the connection returns — that is how a supervisor's decision
  reaches the worker.
- **Session.** In the browser the backend sets an HttpOnly cookie, which JavaScript cannot read. In the
  Android/iOS app the token is kept in the Keystore/Keychain (`@aparajita/capacitor-secure-storage`)
  and sent as an `Authorization` header. It is never written to `localStorage`.
- **Cached data.** `localStorage` holds a copy of the signed-in user's data so the app opens offline.
  It is wiped on logout (unless work is still waiting to upload) and whenever a different account signs in.
- **Media.** Photos and videos are private: the backend only serves them to the uploader, their
  site's supervisors and admins, so screens load them with the session and show object URLs.

Styling: design colours live as Tailwind tokens in `src/app/globals.css` (`bg-brand`, `text-ink-muted`,
`bg-warn-soft`…). Use utility classes inline; add new colours as tokens rather than hex values.

## Not built yet

- The **"Existing user → Current app"** option on login leads to a separate "Artisan Pro Classic"
  design that hasn't been implemented; both account types currently open the new app.
- Site-level totals on Home (biomass, biochar, 30-day trend, activity) are static sample values.
- Credit factor, price and goal are read from `data/constants.ts`; the backend has the same numbers in
  *Credit & quality settings* but the app does not fetch them yet.
- The live camera viewfinder needs camera permission in the webview; where it is unavailable the
  shutter opens the device camera / file picker instead. Neither path has been run on a real phone yet.
