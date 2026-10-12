"use client"

/** Last resort when even the root layout failed: a plain page that restarts the app. */
export default function GlobalError({ error }: { error: Error & { digest?: string }; retry: () => void }) {
  console.error("[app] fatal error", error)
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#F4F0E6", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 32 }}>
        <div>
          <h1 style={{ color: "#1f5a3d", fontSize: 24 }}>Something went wrong · Terjadi kesalahan</h1>
          <p style={{ color: "#5b625d" }}>Your saved work is safe on this phone. · Data Anda aman di ponsel ini.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ height: 56, padding: "0 28px", border: 0, borderRadius: 18, background: "#1f5a3d", color: "#fff", fontSize: 17, fontWeight: 800 }}
          >
            Restart the app · Mulai ulang
          </button>
        </div>
      </body>
    </html>
  )
}
