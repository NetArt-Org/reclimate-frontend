# Testing on real phones (Firebase App Distribution)

Testers install the Android app from Firebase App Distribution before it is on Google Play. Each build is made by
GitHub Actions against the **live backend** (`API_URL`), so testers use real data and real logins.

## One-time setup (Firebase console + GitHub)

1. **Register the Android app** in Firebase (the project the backend uses): Project settings → Your apps → Add app →
   Android, package name `ai.reclimate.artisanpro`. Copy its **App ID** (`1:…:android:…`). No `google-services.json`
   is needed for App Distribution.
2. **Turn on App Distribution**: Firebase console → Release & Monitor → App Distribution → Get started (Android app).
3. **Add testers**: App Distribution → Testers & Groups → create a group, e.g. alias `testers`, and add their email
   addresses (a Google account each).
4. **Service account for GitHub** (Google Cloud console → IAM & Admin → Service accounts):
   create `app-distribution-ci`, give it **only** the role *Firebase App Distribution Admin*, then Keys → Add key →
   JSON. Keep the file private; delete it from your computer after step 5.
5. **GitHub** (reclimate-frontend → Settings → Secrets and variables → Actions):
   - secret `FIREBASE_DISTRIBUTION_KEY` = the whole JSON key file
   - variable `FIREBASE_ANDROID_APP_ID` = the App ID from step 1
   - variable `TESTER_GROUPS` = `testers` (comma-separate several groups)
   - the variables the build already uses: `API_URL` (the backend on App Hosting) and `FIREBASE_*`
   - optional: `DISTRIBUTE_ON_PUSH` = `true` to send every push to `main` to testers
6. **Backend**: `CORS_ORIGINS` must include `https://localhost` (the Android app's origin) — it is in `apphosting.yaml`.

## Sending a build to testers

GitHub → Actions → **App CI** → **Run workflow** → keep "Send to testers" ticked, write what to test → Run.
About 10 minutes later testers get an email "Artisan Pro … is ready to test".

Locally instead (once Java 21 and Android Studio are installed and `npx firebase-tools login` is done):

```bash
FIREBASE_ANDROID_APP_ID=1:…:android:… npm run distribute:android -- "What to test"
```

Builds are **release-signed** when the release-key secrets are set (same key as the Play Store build), otherwise
**debug** builds. A phone cannot switch between the two without uninstalling first.

## For testers

1. Open the invitation email on the Android phone → **Get started** → sign in with the invited Google account.
2. Install **Firebase App Tester** when asked (it lists every build and tells you about new ones).
3. Tap **Download** on the latest build. Android asks to allow installs from this source the first time — allow it.
4. Open Artisan Pro and sign in with your app login (or Register now and wait for approval).
5. New build: App Tester notifies you; tap **Update**. Your data stays (it is on the backend).

Report problems with the build number shown in App Tester and a screenshot.

## What to check on each build

- Sign in, forgot password, Register now (verification email → admin approval)
- A full batch with photos, a firing video and location; the same with mobile data off, then back on
- Supervisor: accept / reject; admin's final approval shows on the worker's phone
- Classic layout (Existing user): each tab, a record of each kind
- Profile: photo, language, privacy policy and terms links, delete account (use a test account)
- Android back button on every screen; app in the background and back
