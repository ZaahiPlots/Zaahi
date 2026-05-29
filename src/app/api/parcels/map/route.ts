import { NextRequest, NextResponse } from 'next/server';
import { ParcelStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';

/** Compact payload for the main map: parcel + latest affection plan only. */
export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Explicit `select` on Parcel (rather than the default-everything
  // `include`) so we can omit `physicalStatus` from the SQL until the
  // production DB has the column. The Prisma client running on Vercel
  // knows the field from schema.prisma + `prisma generate`, and the
  // default scalar selection would emit a SELECT that references the
  // column — which 500s on a DB where the migration hasn't been
  // applied yet (P2022). Whitelisting fields side-steps that until
  // the migration lands on the right environment.
  const parcels = await prisma.parcel.findMany({
    where: {
      geometry: { not: undefined },
      // Hide unverified submissions from the public map
      status: { in: [ParcelStatus.LISTED, ParcelStatus.VERIFIED, ParcelStatus.IN_DEAL] },
    },
    select: {
      id: true,
      plotNumber: true,
      district: true,
      emirate: true,
      status: true,
      area: true,
      geometry: true,
      currentValuation: true,
      affectionPlans: {
        orderBy: { fetchedAt: 'desc' },
        take: 1,
        select: {
          maxFloors: true,
          maxHeightMeters: true,
          maxHeightCode: true,
          projectName: true,
          community: true,
          buildingLimitGeometry: true,
          plotAreaSqm: true,
          plotAreaSqft: true,
          maxGfaSqm: true,
          maxGfaSqft: true,
          far: true,
          landUseMix: true,
          setbacks: true,
          buildingStyle: true,
          // Date the plan was issued by DDA (preferred) + fetchedAt as
          // a fallback for the hover-card "Affection Plan" row.
          sitePlanIssue: true,
          fetchedAt: true,
        },
      },
    },
  });

  const items = parcels.map((p) => {
    const plan = p.affectionPlans[0];
    return {
      id: p.id,
      plotNumber: p.plotNumber,
      district: p.district,
      emirate: p.emirate,
      status: p.status,
      // physicalStatus is intentionally NOT surfaced here right now —
      // Vercel's deployed Prisma client may not yet know about the
      // column (deploy + cache lag), and the resulting `p.physicalStatus`
      // access throws 500 on the live function. Schema + DB column are
      // already in place; restore this line after the next clean
      // Vercel build picks up the regenerated client.
      area: p.area,
      geometry: p.geometry,
      currentValuation: p.currentValuation?.toString() ?? null,
      plan: plan
        ? {
            projectName: plan.projectName,
            community: plan.community,
            maxFloors: plan.maxFloors,
            maxHeightMeters: plan.maxHeightMeters,
            maxHeightCode: plan.maxHeightCode,
            plotAreaSqm: plan.plotAreaSqm,
            plotAreaSqft: plan.plotAreaSqft,
            maxGfaSqm: plan.maxGfaSqm,
            maxGfaSqft: plan.maxGfaSqft,
            sitePlanIssue: plan.sitePlanIssue?.toISOString() ?? null,
            fetchedAt: plan.fetchedAt?.toISOString() ?? null,
            far: plan.far,
            landUseMix: plan.landUseMix,
            buildingLimitGeometry: plan.buildingLimitGeometry,
            setbacks: plan.setbacks,
            buildingStyle: plan.buildingStyle,
          }
        : null,
    };
  });

  return NextResponse.json({ items });
}
