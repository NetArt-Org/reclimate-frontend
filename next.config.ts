import path from "node:path"
import type { NextConfig } from "next"
import pkg from "./package.json"

/**
 * Static export: `next build` emits plain HTML/JS/CSS to `out/`, which
 * Capacitor packages into the Android/iOS app (see capacitor.config.ts).
 */
// A release build must talk to the live backend over HTTPS: a phone has no "localhost" backend. The address comes
// from .env.production; set ALLOW_LOCAL_API=1 to build against a local backend on purpose.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? ""
if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_API && !/^https:\/\/(?!localhost|127\.|10\.)/.test(apiUrl)) {
  throw new Error(`NEXT_PUBLIC_API_URL must be the live https backend for a release build (got "${apiUrl}"). See .env.production.`)
}

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  turbopack: { root: path.resolve(__dirname) },
  // The app reports its version to the backend (the admin sees who runs an older app).
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
}

export default nextConfig
