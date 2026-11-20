// ZAAHI Feasibility v6.1 — /feasibility/compare?v=<versionId>,… (2–5 ids).
//
// Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md.
// Gated twice: the v6 feature flag (404 when off) and <AuthGuard>. The ids in
// the URL grant nothing by themselves: /api/me/feasibility-studies/compare
// returns a version only to its owner or to the holder of an active
// FEASIBILITY / OFFER vault share, and 404s the whole request otherwise.

import { notFound } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { IS_FEASIBILITY_V6_ENABLED } from '@/lib/feasibility-v6/featureFlag';
import ComparePageClient from './ComparePageClient';

export const metadata = { title: 'Compare feasibility studies · ZAAHI' };

export default async function FeasibilityComparePage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  if (!IS_FEASIBILITY_V6_ENABLED) notFound();
  const { v } = await searchParams;
  const raw = Array.isArray(v) ? v.join(',') : v ?? '';
  return (
    <AuthGuard>
      <ComparePageClient raw={raw} />
    </AuthGuard>
  );
}
