// ZAAHI Feasibility v6.0 — production route.
//
// /parcels/[id]/feasibility — full-screen calculator on a real DLD parcel.
// Server-side flow:
//   1. Feature-flag gate (FEASIBILITY_V6_ENABLED env var). Default-disabled.
//      Returns 404 in production until Sprint 11 cutover. Defence-in-depth:
//      even if the route file ships, the gate keeps it dark.
//   2. Prisma fetch parcel + latest affection plan by `[id]`. Missing → 404.
//   3. adaptParcelToInput() turns the Prisma row into the calculator's
//      ParcelInput shape (mirrors mock data → unified type).
//   4. Wrap in <AuthGuard> (client component) per CLAUDE.md security rules.
//   5. Render the shared <FeasibilityV6Calculator> with banner="none".
//
// v5 calculator continues to live at /parcels/map SidePanel — Strangler Fig.

import { notFound } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import FeasibilityV6Calculator from '@/components/feasibility/FeasibilityV6Calculator';
import { IS_FEASIBILITY_V6_ENABLED } from '@/lib/feasibility-v6/featureFlag';
import { adaptParcelToInput } from '@/lib/feasibility-v6/parcelInput';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ParcelFeasibilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!IS_FEASIBILITY_V6_ENABLED) {
    notFound();
  }
  const { id } = await params;
  const parcel = await prisma.parcel.findUnique({
    where: { id },
    include: {
      affectionPlans: { orderBy: { fetchedAt: 'desc' }, take: 1 },
    },
  });
  if (!parcel) {
    notFound();
  }
  const plan = parcel.affectionPlans[0] ?? null;
  const input = adaptParcelToInput(parcel, plan);
  return (
    <AuthGuard>
      <FeasibilityV6Calculator parcel={input} banner="none" />
    </AuthGuard>
  );
}
