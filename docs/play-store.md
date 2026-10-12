# Publishing Artisan Pro on Google Play

A checklist for the first release, and the answers the Play Console asks for. Keep it with each release.

## 1. Build

```bash
# .env.production: NEXT_PUBLIC_API_URL = the backend on Firebase App Hosting (the build refuses localhost);
# .env.local: NEXT_PUBLIC_FIREBASE_* only (never the API URL — it would override .env.production)
npm version patch            # or minor: package.json's version is the store version (versionCode 2.7.0 → 20700)
npm run build && npx cap sync android
```

Signing: create the upload key once and keep it safe (Play cannot update the app without it):

```bash
cd android && keytool -genkey -v -keystore artisan-pro-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias artisan-pro
cp keystore.properties.example keystore.properties   # fill in the passwords (git-ignored)
./gradlew bundleRelease                              # → app/build/outputs/bundle/release/app-release.aab
```

Enrol in **Play App Signing** when uploading the first bundle.

## 2. Store listing

- App name: **Artisan Pro** · package `ai.reclimate.artisanpro`
- Icon: `assets/icon-only.png` (512×512 export) · feature graphic 1024×500 (to make)
- Screenshots: at least 2 phone screenshots (login, Home, a batch step, Classic Production)
- Category: Business (or Productivity) · Contact email: the company email in the backend's company profile
- **Privacy policy URL**: `https://<backend>/privacy`

## 3. App content (Policy → App content)

| Question | Answer |
|---|---|
| Privacy policy | `https://<backend>/privacy` |
| Ads | No ads |
| App access | Restricted: give reviewers a test login (an approved field account at a test site) |
| Target audience | 18 and over |
| News app / COVID / Government | No |
| Account deletion | In the app: Profile/Settings → Delete account. Web: `https://<backend>/account-deletion` |

### Data safety

Data is encrypted in transit (HTTPS). Users can request deletion (in the app and on the web page). No data is
sold or used for advertising.

| Data type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Name, email address, phone number, address (village) | Yes | With carbon registries/verifiers when audited | Phone/address: no (needed for the account) | Account management, app functionality |
| Precise location | Yes (only when "Save location" is tapped) | With verifiers (application site) | Yes | App functionality (where biochar was applied) |
| Photos and videos | Yes | With verifiers | No (evidence is required) | App functionality |
| App info and performance: crash logs | No (none collected yet) | — | — | — |
| Device or other IDs | No (only phone model and app version) | No | — | App functionality, support |
| User IDs | Yes (account id) | No | No | Account management |

Service providers (Google Firebase/Cloud, Neon) process data on our behalf and do not count as "sharing".

## 4. Permissions the app declares

- `CAMERA` — photos/videos of each batch step
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` — location of the field where biochar is applied (asked when used)
- `INTERNET`

No background location, contacts, SMS or storage permissions.

## 5. Before each release

- Backend deployed and healthy; `CORS_ORIGINS` includes `https://localhost` and `capacitor://localhost`
- Bump the version (`npm version …`); the admin's "latest app version" (backend `LATEST_APP_VERSION`) updated
- Test on a real phone: sign in, Register now (email verification → approval), a batch with photos and video,
  offline then online, supervisor review, Classic layout, delete account
