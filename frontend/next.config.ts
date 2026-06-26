import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  // Pin the workspace root to this folder. A stray lockfile in a parent dir
  // (C:\Users\NPC\package-lock.json) makes Turbopack infer the wrong root and
  // serve 404 for every route — which can wedge `next dev` into a respawn loop.
  turbopack: {
    root: __dirname,
  },
  // Next blocks cross-origin requests to dev-only assets (incl. the HMR
  // WebSocket) for any host not on its allowlist (`localhost` by default).
  // Since the server binds to 0.0.0.0, loading the app via http://127.0.0.1:3000
  // gets the HMR socket rejected (403 → ERR_INVALID_HTTP_RESPONSE), which wedges
  // hydration and leaves pages as static HTML — forms then submit natively and
  // leak credentials into the URL. Allow 127.0.0.1 so both hosts hydrate.
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
