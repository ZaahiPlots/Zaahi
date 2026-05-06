// ZAAHI Feasibility Calculator v6.0 — INTERNAL PREVIEW route.
//
// Localhost + Vercel-preview only. Production deploy returns 404 via
// IS_PRODUCTION_DEPLOY gate. See ./previewGuard.ts for the env-var matrix.
// Companion to src/app/preview/mole/* — same double-gate pattern.
//
// Layout:
//   <AuthGuard>
//     <PreviewParcelPicker>           ← preview-only mock-parcel dropdown
//       <FeasibilityV6Calculator />   ← shared component, parcel as prop
//     </PreviewParcelPicker>
//   </AuthGuard>
//
// The calculator itself lives at src/components/feasibility/FeasibilityV6Calculator.tsx
// and is shared with the production /parcels/[id]/feasibility route.

import { notFound } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import PreviewParcelPicker from './PreviewParcelPicker';
import { IS_PRODUCTION_DEPLOY } from './previewGuard';

export default function FeasibilityV6PreviewPage() {
  if (IS_PRODUCTION_DEPLOY) {
    notFound();
  }
  return (
    <AuthGuard>
      <PreviewParcelPicker />
    </AuthGuard>
  );
}
