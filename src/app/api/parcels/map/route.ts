import { NextResponse } from 'next/server';
import { ParcelStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Compact payload for the main map: parcel + latest affection plan only. */
export async function GET() {
  const parcels = await prisma.parcel.findMany({
    where: {
      geometry: { not: undefined },
      // Hide unverified submissions from the public map
      status: { in: [ParcelStatus.LISTED, ParcelStatus.VERIFIED, ParcelStatus.IN_DEAL] },
    },
    include: {
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
          maxGfaSqm: true,
          far: true,
          landUseMix: true,
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
            maxGfaSqm: plan.maxGfaSqm,
            far: plan.far,
            landUseMix: plan.landUseMix,
            buildingLimitGeometry: plan.buildingLimitGeometry,
          }
        : null,
    };
  });

  return NextResponse.json({ items });
}
