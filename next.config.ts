import type { NextConfig } from "next";

/**
 * The /api/layers/* route handlers read GeoJSON / KML from `data/layers/`
 * via `path.join(process.cwd(), 'data', 'layers', ...)`. Next.js's output
 * file tracing only auto-bundles files referenced by static paths it can
 * see at build time — and the layer file paths are split across many
 * route handlers and built up at runtime, so we tell tracing explicitly
 * to ship the entire `data/` directory with every API route.
 *
 * Without this, Vercel deploys returned `500 ENOENT: no such file or
 * directory` for every layer endpoint and the map showed zero overlays.
 */
const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/layers/**/*": ["./data/layers/**/*"],
  },
};

export default nextConfig;
