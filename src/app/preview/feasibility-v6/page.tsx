// ZAAHI Feasibility Calculator v6.0 — INTERNAL PREVIEW route.
//
// Localhost + Vercel-preview only. Production deploy returns 404.
// See ./previewGuard.ts for the env-var matrix and Vercel project setup.
//
// Companion route to src/app/preview/mole/* (Mole Agent §41 preview), uses the
// same double-gate pattern (NODE_ENV + NEXT_PUBLIC_VERCEL_ENV).
//
// All v6 spec deliverables that are *visual* land here:
//   - 13 engines + 2 modifiers (engines.ts)
//   - Live diff badges (FeasibilityV6Calculator.tsx)
//   - Hover tooltips top 30 fields EN-only (tooltips.ts)
//   - Fullscreen toggle
//   - Glassmorphism + #C8A96E + Georgia + Inter (per CLAUDE.md UI STYLE GUIDE)
//   - jsPDF export (no weasyprint server endpoint)
//   - Mock in-memory parcel data (mockData.ts)
//   - RED warning banner

import { notFound } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import FeasibilityV6Calculator from './FeasibilityV6Calculator';
import { IS_PRODUCTION_DEPLOY } from './previewGuard';

export default function FeasibilityV6PreviewPage() {
  if (IS_PRODUCTION_DEPLOY) {
    notFound();
  }
  return (
    <AuthGuard>
      <FeasibilityV6Calculator />
    </AuthGuard>
  );
}
