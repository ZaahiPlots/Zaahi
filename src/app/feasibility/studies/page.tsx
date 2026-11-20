// ZAAHI Feasibility v6.1 — /feasibility/studies: every study the user saved.
//
// Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md.
// Gated twice: the v6 feature flag (404 when off) and <AuthGuard>. The data
// itself comes from /api/me/feasibility-studies, which gates on
// getApprovedUserId — the page holds nothing until that answers.

import { notFound } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { IS_FEASIBILITY_V6_ENABLED } from '@/lib/feasibility-v6/featureFlag';
import StudiesPageClient from './StudiesPageClient';

export const metadata = { title: 'My feasibility studies · ZAAHI' };

export default function FeasibilityStudiesPage() {
  if (!IS_FEASIBILITY_V6_ENABLED) notFound();
  return (
    <AuthGuard>
      <StudiesPageClient />
    </AuthGuard>
  );
}
