#!/usr/bin/env bash
# Build the Android app against the live backend and send it to testers with Firebase App Distribution.
# Needs: Java 21 + the Android SDK (Android Studio), and the Firebase CLI signed in (npx firebase-tools login).
#   FIREBASE_ANDROID_APP_ID=1:…:android:… npm run distribute:android -- "What to test"
# Uses .env.production (live backend). Release-signed when android/keystore.properties exists, otherwise debug.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${FIREBASE_ANDROID_APP_ID:?Set FIREBASE_ANDROID_APP_ID (Firebase console → Project settings → Your apps)}"
GROUPS="${TESTER_GROUPS:-testers}"
NOTES="${1:-}"

npm run build
npx cap sync android
cd android
if [ -f keystore.properties ]; then
  ./gradlew assembleRelease
  APK=$(ls app/build/outputs/apk/release/*.apk | head -1); KIND=release-signed
else
  ./gradlew assembleDebug
  APK=$(ls app/build/outputs/apk/debug/*.apk | head -1); KIND=debug
fi
cd ..
VERSION=$(node -p "require('./package.json').version")
printf '%s\n\nVersion %s (%s build) · %s\n' "$NOTES" "$VERSION" "$KIND" "$(git rev-parse --short HEAD)" > /tmp/artisan-release-notes.txt
npx --yes firebase-tools@14 appdistribution:distribute "android/$APK" --app "$FIREBASE_ANDROID_APP_ID" --groups "$GROUPS" --release-notes-file /tmp/artisan-release-notes.txt
