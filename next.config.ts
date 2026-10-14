import path from "node:path"
import type { NextConfig } from "next"
import { PHASE_PRODUCTION_BUILD } from "next/constants"
import pkg from "./package.json"

/**
 * Static export: `next build` emits plain HTML/JS/CSS to `out/`, which
 * Capacitor packages into the Android/iOS app (see capacitor.config.ts).
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  turbopack: { root: path.resolve(__dirname) },
  // The app reports its version to the backend (the admin sees who runs an older app).
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
}

/**
 * A release build (`next build`) must talk to the live backend over HTTPS: a phone has no "localhost" backend.
 * The address comes from .env.production (Vercel / GitHub Actions: their settings); ALLOW_LOCAL_API=1 builds against
 * a local backend on purpose. Only the build is checked — `next dev` and `next typegen` work without it.
 */
export default function config(phase: string): NextConfig {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? ""
  // `next typegen` also loads the config in the build phase; it builds nothing, so it is not checked.
  const building = phase === PHASE_PRODUCTION_BUILD && !process.argv.includes("typegen")
  if (building && !process.env.ALLOW_LOCAL_API && !/^https:\/\/(?!localhost|127\.|10\.)/.test(apiUrl)) {
    throw new Error(`NEXT_PUBLIC_API_URL must be the live https backend for a release build (got "${apiUrl}"). See .env.example.`)
  }
  return nextConfig
}
