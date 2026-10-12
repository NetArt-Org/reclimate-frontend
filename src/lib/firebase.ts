import { Capacitor } from "@capacitor/core"
import { getApp, getApps, initializeApp } from "firebase/app"
import {
  GoogleAuthProvider, browserLocalPersistence, createUserWithEmailAndPassword, getAuth, indexedDBLocalPersistence, initializeAuth,
  onIdTokenChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut,
  updatePassword, updateProfile, type Auth, type User,
} from "firebase/auth"

/**
 * Sign-in for the field app. Logins are created by an admin in the backend (Networks & people → person →
 * App login); people sign in with that email and password, or with Google on the same email.
 * Firebase keeps the session on the device and hands out short-lived ID tokens, which the API client
 * sends to the backend. These settings are public by design (they identify the project, not a secret).
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = () => !!(config.apiKey && config.authDomain && config.projectId)

/** Google sign-in uses a browser popup; inside the Android/iOS app it needs a native plugin (not set up yet). */
export const canUseGoogle = () => !Capacitor.isNativePlatform()

let instance: Auth | null = null
export function auth(): Auth {
  if (instance) return instance
  const app = getApps().length ? getApp() : initializeApp(config)
  // In the native webview the default setup waits on a popup helper that never loads, so the session
  // is kept in IndexedDB without it. In the browser the default (with popups) is used.
  instance = Capacitor.isNativePlatform()
    ? initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
    : getAuth(app)
  return instance
}

/** The signed-in Firebase user once the saved session has been restored, or null. */
export async function currentUser(): Promise<User | null> {
  const a = auth()
  await a.authStateReady()
  return a.currentUser
}

export const signInWithPassword = (email: string, password: string) => signInWithEmailAndPassword(auth(), email.trim(), password)

export function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: "select_account" })
  return signInWithPopup(auth(), provider)
}

export const sendReset = (email: string) => sendPasswordResetEmail(auth(), email.trim())

/**
 * Register now: create the Firebase account (email + password). The person then fills in their details and an
 * admin approves them before the app opens. A verification email is sent as well (best effort).
 */
export async function createAccount(email: string, password: string, name: string) {
  const cred = await createUserWithEmailAndPassword(auth(), email.trim(), password)
  if (name) await updateProfile(cred.user, { displayName: name }).catch(() => {})
  await sendEmailVerification(cred.user).catch(() => {})
  return cred.user
}

/** Send the email-verification link again. */
export async function resendVerification() {
  const u = auth().currentUser
  if (u) await sendEmailVerification(u)
}

/** Has the signed-in account verified its email (after the person opened the link)? Refreshes the token too. */
export async function checkVerified(): Promise<boolean> {
  const u = auth().currentUser
  if (!u) return false
  await u.reload()
  if (u.emailVerified) await u.getIdToken(true)
  return u.emailVerified
}

/** Name and email of the signed-in account (e.g. from Google), to prefill Register now. */
export const accountInfo = () => {
  const u = auth().currentUser
  return { name: u?.displayName ?? "", email: u?.email ?? "" }
}

export async function changePassword(next: string) {
  const u = auth().currentUser
  if (!u) throw new Error("not signed in")
  await updatePassword(u, next)
}

/** How the current session was signed in ("password" or "google.com"). */
export async function signInProvider(): Promise<string | null> {
  const u = auth().currentUser
  return u ? ((await u.getIdTokenResult()).signInProvider ?? null) : null
}

export const firebaseSignOut = () => signOut(auth())

/** A fresh ID token for the backend (Firebase refreshes it when it is close to expiry). */
export async function idToken(force = false): Promise<string | null> {
  const u = await currentUser()
  return u ? u.getIdToken(force) : null
}

export const onTokenChange = (fn: (u: User | null) => void) => onIdTokenChanged(auth(), fn)

/** Firebase error codes → the message key shown on the login screen. */
export function authErrorKey(e: unknown): "loginFailed" | "loginOffline" | "loginTooMany" | "loginCancelled" | "passwordWeak" | "loginGeneric" | "emailInUse" {
  const code = (e as { code?: string })?.code ?? ""
  if (code === "auth/email-already-in-use") return "emailInUse"
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email", "auth/user-disabled"].includes(code)) return "loginFailed"
  if (code === "auth/network-request-failed") return "loginOffline"
  if (code === "auth/too-many-requests") return "loginTooMany"
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "loginCancelled"
  if (code === "auth/weak-password" || code === "auth/password-does-not-meet-requirements") return "passwordWeak"
  return "loginGeneric"
}
