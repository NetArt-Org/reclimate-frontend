import path from "node:path"
import type { NextConfig } from "next"

/**
 * Static export: `next build` emits plain HTML/JS/CSS to `out/`, which
 * Capacitor packages into the Android/iOS app (see capacitor.config.ts).
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  turbopack: { root: path.resolve(__dirname) },
}

export default nextConfig
