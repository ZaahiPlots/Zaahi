import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';
import { fetchPlotInfoHtml, parseAffectionPlan, fetchBuildingLimit } from '@/lib/dda';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/parcels/:id/affection-plan/refresh
// Pull a fresh affection plan from DDA and store a new AffectionPlan row.
// Either the immutable creator (ownerId) or the verified owner
// (verifiedOwnerUserId, post-Title-Deed-verification) may refresh —
// spec §5.4.1 LOCK-8 / Step 12 audit SF-1.
export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const parcel = await prisma.parcel.findUnique({ where: { id } });
  if (!parcel) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (parcel.ownerId !== userId && parcel.verifiedOwnerUserId !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const html = await fetchPlotInfoHtml(parcel.plotNumber);
  const plan = parseAffectionPlan(html);
  let buildingLimit: GeoJSON.Polygon | null = null;
  try {
    buildingLimit = await fetchBuildingLimit(parcel.plotNumber);
  } catch {
    // Building Limit is optional — plan still saves without it.
  }

  const created = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source: 'gis.dda.gov.ae/DIS',
      plotNumber: plan.plotNumber || parcel.plotNumber,
      oldNumber: plan.oldNumber,
      projectName: plan.projectName,
      community: plan.community,
      masterDeveloper: plan.masterDeveloper,
      plotAreaSqm: plan.plotAreaSqm,
      plotAreaSqft: plan.plotAreaSqft,
      maxGfaSqm: plan.maxGfaSqm,
      maxGfaSqft: plan.maxGfaSqft,
      maxHeightCode: plan.maxHeightCode,
      maxFloors: plan.maxFloors,
      maxHeightMeters: plan.maxHeightMeters,
      far: plan.far,
      setbacks: plan.setbacks as unknown as Prisma.InputJsonValue,
      landUseMix: plan.landUseMix as unknown as Prisma.InputJsonValue,
      sitePlanIssue: plan.sitePlanIssue ? new Date(plan.sitePlanIssue) : null,
      sitePlanExpiry: plan.sitePlanExpiry ? new Date(plan.sitePlanExpiry) : null,
      notes: plan.notes,
      buildingLimitGeometry:
        (buildingLimit as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      raw: plan as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ id: created.id, fetchedAt: created.fetchedAt });
}
