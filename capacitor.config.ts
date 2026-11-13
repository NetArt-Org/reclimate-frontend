import type { CapacitorConfig } from "@capacitor/cli"

/**
 * Mobile container. `npm run build` produces the static site in `out/`;
 * `npx cap sync` copies it into the native Android / iOS projects.
 */
const config: CapacitorConfig = {
  appId: "ai.reclimate.artisanpro",
  appName: "Artisan Pro",
  webDir: "out",
  backgroundColor: "#F4F0E6",
  plugins: {
    // Google sign-in in the Android app: the plugin gets the Google token, the web Firebase SDK keeps the session.
    FirebaseAuthentication: { skipNativeAuth: true, providers: ["google.com"] },
  },
}

export default config
