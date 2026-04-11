import type { NextConfig } from "next";

/**
 * Each /api/layers/* route handler reads exactly one geojson / KML from
 * `data/layers/...` via a single static `path.join(process.cwd(), 'data',
 * 'layers', '...')` const. Next.js's output file tracing detects that
 * literal path during the build and automatically bundles just that one
 * file with the function — no `outputFileTracingIncludes` needed.
 *
 * We previously tried `outputFileTracingIncludes: { "/api/layers/**\/*":
 * ["./data/layers/**\/*"] }` which forced every layer function to bundle
 * the entire 54 MB of layer data. On Vercel Hobby (50 MB per-function
 * limit) that pushed each function over the limit, the data was stripped
 * silently, and every layer endpoint returned 500 ENOENT. Letting the
 * implicit per-route tracing do its job keeps each function at the
 * single file it actually needs (≤4 MB).
 */
const nextConfig: NextConfig = {};

export default nextConfig;
