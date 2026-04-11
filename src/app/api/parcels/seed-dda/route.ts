import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ParcelStatus, UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { fetchPlotInfoHtml, parseAffectionPlan, fetchBuildingLimit } from '@/lib/dda';
import { getApprovedUserId } from '@/lib/auth';

export const runtime = 'nodejs';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';

interface PolyFeature {
  geometry: GeoJSON.Polygon;
  properties: Record<string, unknown>;
}

/**
 * POST /api/parcels/seed-dda  { plotNumber: string, priceAed?: number }
 *
 * Pulls real polygon, affection plan, and building limit from DDA and stores
 * (or upserts) the parcel + latest AffectionPlan in our DB. The Add Plot
 * launcher in the map header calls this — system user owns the row until a
 * real owner is assigned.
 */
export async function POST(req: NextRequest) {
  const callerId = await getApprovedUserId(req);
  if (!callerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { plotNumber?: string; priceAed?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const plotNumber = body.plotNumber?.toString().trim();
  if (!plotNumber || !/^\d{5,}$/.test(plotNumber)) {
    return NextResponse.json({ error: 'invalid_plot_number' }, { status: 400 });
  }
  const priceAed = typeof body.priceAed === 'number' && body.priceAed > 0 ? body.priceAed : 0;
  const priceFils = BigInt(priceAed) * BigInt(100);

  // 1. Polygon from DDA BASIC_LAND_BASE/2
  const polyUrl =
    'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query' +
    `?where=PLOT_NUMBER%3D%27${plotNumber}%27&outFields=*&returnGeometry=true&outSR=4326&f=geojson`;
  const polyRes = await fetch(polyUrl, { cache: 'no-store' });
  if (!polyRes.ok) return NextResponse.json({ error: 'dda_polygon_failed' }, { status: 502 });
  const polyJson = (await polyRes.json()) as { features?: PolyFeature[] };
  const feat = polyJson.features?.[0];
  if (!feat?.geometry) return NextResponse.json({ error: 'plot_not_found_in_dda' }, { status: 404 });

  const geometry = feat.geometry;
  const props = feat.properties;
  const projectName = (props.PROJECT_NAME as string) ?? 'UNKNOWN';
  const developer = (props.DEVELOPER_NAME as string) ?? null;
  const district = projectName;
  const ring = geometry.coordinates[0];
  const cLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;

  // 2. Affection plan (best-effort)
  let plan: Awaited<ReturnType<typeof parseAffectionPlan>> | null = null;
  try {
    const html = await fetchPlotInfoHtml(plotNumber);
    plan = parseAffectionPlan(html);
  } catch {
    /* ignore — master plots return SEE NOTES */
  }

  // 3. Building limit (best-effort)
  let buildingLimit: GeoJSON.Polygon | null = null;
  try {
    buildingLimit = await fetchBuildingLimit(plotNumber);
  } catch {
    /* optional */
  }

  // 4. System owner
  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    create: {
      id: SYSTEM_USER_ID,
      email: 'system@zaahi.ae',
      role: UserRole.ADMIN,
      name: 'ZAAHI System',
    },
    update: {},
  });

  const areaSqft =
    plan?.plotAreaSqft ??
    (typeof props.AREA_SQFT === 'number' ? (props.AREA_SQFT as number) : 0);

  // 5. Parcel upsert
  const parcel = await prisma.parcel.upsert({
    where: {
      emirate_district_plotNumber: { emirate: 'Dubai', district, plotNumber },
    },
    create: {
      plotNumber,
      ownerId: SYSTEM_USER_ID,
      area: areaSqft || 0,
      emirate: 'Dubai',
      district,
      latitude: cLat,
      longitude: cLng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
      status: priceAed > 0 ? ParcelStatus.LISTED : ParcelStatus.VACANT,
      currentValuation: priceAed > 0 ? priceFils : null,
    },
    update: {
      area: areaSqft || 0,
      latitude: cLat,
      longitude: cLng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
      status: priceAed > 0 ? ParcelStatus.LISTED : ParcelStatus.VACANT,
      currentValuation: priceAed > 0 ? priceFils : null,
    },
  });

  // 6. AffectionPlan
  await prisma.affectionPlan.deleteMany({ where: { parcelId: parcel.id } });
  await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source: plan ? 'gis.dda.gov.ae/DIS' : 'dda:basic_land_base',
      plotNumber: plan?.plotNumber || plotNumber,
      oldNumber: plan?.oldNumber ?? null,
      projectName: plan?.projectName ?? projectName,
      community: plan?.community ?? district,
      masterDeveloper: plan?.masterDeveloper ?? developer,
      plotAreaSqm: plan?.plotAreaSqm ?? (typeof props.AREA_SQM === 'number' ? (props.AREA_SQM as number) : null),
      plotAreaSqft: plan?.plotAreaSqft ?? (typeof props.AREA_SQFT === 'number' ? (props.AREA_SQFT as number) : null),
      maxGfaSqm: plan?.maxGfaSqm ?? (typeof props.GFA_SQM === 'number' && (props.GFA_SQM as number) > 0 ? (props.GFA_SQM as number) : null),
      maxGfaSqft: plan?.maxGfaSqft ?? (typeof props.GFA_SQFT === 'number' && (props.GFA_SQFT as number) > 0 ? (props.GFA_SQFT as number) : null),
      maxHeightCode: plan?.maxHeightCode ?? (props.MAX_HEIGHT as string | null) ?? null,
      maxFloors: plan?.maxFloors ?? null,
      maxHeightMeters: plan?.maxHeightMeters ?? null,
      far: plan?.far ?? null,
      setbacks: (plan?.setbacks ?? []) as unknown as Prisma.InputJsonValue,
      landUseMix: (
        plan?.landUseMix && plan.landUseMix.length > 0
          ? plan.landUseMix
          : typeof props.MAIN_LANDUSE === 'string' && props.MAIN_LANDUSE
            ? (props.MAIN_LANDUSE as string).split(' - ').map((cat: string) => ({
                category: cat.trim(),
                sub: (props.SUB_LANDUSE as string ?? '').split(' - ').map((s: string) => s.trim()).join(', '),
                areaSqm: null,
              }))
            : []
      ) as unknown as Prisma.InputJsonValue,
      sitePlanIssue: plan?.sitePlanIssue ? new Date(plan.sitePlanIssue) : null,
      sitePlanExpiry: plan?.sitePlanExpiry ? new Date(plan.sitePlanExpiry) : null,
      notes: plan?.notes ?? null,
      buildingLimitGeometry:
        (buildingLimit as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });

  return NextResponse.json({
    id: parcel.id,
    plotNumber,
    district,
    longitude: cLng,
    latitude: cLat,
  });
}
