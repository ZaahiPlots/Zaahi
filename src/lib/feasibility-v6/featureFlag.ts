// ZAAHI Feasibility v6.0 — feature-flag check.
//
// Per docs/specs/feasibility-v6/11_IMPLEMENTATION_PLAN.md §3.5, the v6 UI is
// gated behind an env var. The flag is read in BOTH a Server Component
// (production /parcels/[id]/feasibility internal-test route) and a Client
// Component (the canonical mount inside /parcels/map SidePanel post-Sprint-1.5).
//
// To work in both runtimes we use the NEXT_PUBLIC_ prefix — Next.js inlines
// these at build time into the client bundle while the server still reads them
// directly from process.env. Trade-off: the flag boolean is observable in
// shipped JS, which is acceptable because:
//   - Boolean is not a secret. Knowing v6 exists doesn't unlock anything; the
//     route + SidePanel mount still need a real session and the flag value
//     to be 'true' at build time.
//   - Defence-in-depth: the production route still calls notFound() and the
//     SidePanel still falls back to v5 rendering.
//
// Behaviour matrix (rebuild required when flipping):
//   NEXT_PUBLIC_FEASIBILITY_V6_ENABLED = "true"  → enabled
//   anything else / unset                        → disabled
//
// Default-disabled. Stays 404 + v5-only in production until Sprint 11 cutover.

export const IS_FEASIBILITY_V6_ENABLED: boolean =
  process.env.NEXT_PUBLIC_FEASIBILITY_V6_ENABLED === 'true';

export function describeFeatureFlagEnv(): string {
  return `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED=${process.env.NEXT_PUBLIC_FEASIBILITY_V6_ENABLED ?? 'unset'} → IS_FEASIBILITY_V6_ENABLED=${IS_FEASIBILITY_V6_ENABLED}`;
}
