// ZAAHI Feasibility Calculator v6.0 — production-deploy guard.
//
// LOCALHOST + Vercel-preview only. Production deploy of zaahi.io returns 404.
//
//   pnpm dev (localhost)                       → IS_PRODUCTION_DEPLOY = false → route accessible
//   pnpm build && pnpm start (local prod)      → IS_PRODUCTION_DEPLOY = false → route accessible
//   Vercel preview deploy (any branch)         → IS_PRODUCTION_DEPLOY = false → route accessible (Жан + Dymo can share)
//   Vercel production deploy (main branch)     → IS_PRODUCTION_DEPLOY = true  → route returns 404
//
// Two signals required because:
//   - process.env.NODE_ENV === 'production' during `pnpm start` of any local
//     production build, so it alone cannot distinguish a Vercel production
//     deploy from any other production-mode bundle.
//   - process.env.VERCEL_ENV is server-side only; the NEXT_PUBLIC_VERCEL_ENV
//     mirror is what reaches the client bundle but Vercel does NOT auto-populate
//     it. Project owners MUST set NEXT_PUBLIC_VERCEL_ENV explicitly per
//     environment for this guard to fire on production.
//
// Vercel project setup (one-time, by Жан) — same as preview/mole route:
//   Vercel dashboard → zaahi project → Settings → Environment Variables
//   Add: NEXT_PUBLIC_VERCEL_ENV = "production"  (scope: Production only)
//   Add: NEXT_PUBLIC_VERCEL_ENV = "preview"     (scope: Preview only)
//
// Defence-in-depth: production-deploy AND production-env-var must BOTH be true.

export const IS_PRODUCTION_DEPLOY: boolean =
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';

export function describePreviewEnv(): string {
  return `NODE_ENV=${process.env.NODE_ENV ?? 'unset'} NEXT_PUBLIC_VERCEL_ENV=${process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'unset'} → IS_PRODUCTION_DEPLOY=${IS_PRODUCTION_DEPLOY}`;
}
