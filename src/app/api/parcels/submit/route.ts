import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ParcelStatus, UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';

export const runtime = 'nodejs';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';

interface PolyFeature {
  geometry: GeoJSON.Polygon;
  properties: Record<string, unknown>;
}

/**
 * POST /api/parcels/submit
 *
 * New listing submission (Broker or Owner flow). Creates a Parcel with
 * status = PENDING_REVIEW so it doesn't appear on the public map until
 * an admin verifies the documents.
 *
 * Body:
 *   plotNumber, askingPriceAed, landUse, description?
 *   flow: "broker" | "owner"
 *   broker?: { reraPermit, contractRef? }
 *   owner?:  { fullName, phone, email, titleDeedNumber? }
 */
export async function POST(req: NextRequest) {
  const callerId = await getApprovedUserId(req);
  if (!callerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: {
    plotNumber?: string;
    askingPriceAed?: number;
    landUse?: string;
    description?: string;
    flow?: 'broker' | 'owner';
    broker?: { reraPermit?: string; contractRef?: string };
    owner?: { fullName?: string; phone?: string; email?: string; titleDeedNumber?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const plotNumber = body.plotNumber?.toString().trim();
  const askingPrice = Number(body.askingPriceAed) || 0;
  const flow = body.flow;
  if (!plotNumber || !flow) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
  }
  if (flow === 'broker' && !body.broker?.reraPermit) {
    return NextResponse.json({ error: 'rera_permit_required' }, { status: 400 });
  }
  if (flow === 'owner' && (!body.owner?.fullName || !body.owner?.phone)) {
    return NextResponse.json({ error: 'owner_contact_required' }, { status: 400 });
  }

  const priceFils = BigInt(Math.max(0, Math.round(askingPrice))) * BigInt(100);

  // Try to enrich from DDA polygon (works for 7+ digit DDA plot numbers)
  let geometry: GeoJSON.Polygon | null = null;
  let district = 'UNKNOWN';
  let areaSqft = 0;
  let lng: number | null = null;
  let lat: number | null = null;
  if (/^\d{5,}$/.test(plotNumber)) {
    try {
      const polyUrl =
        'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query' +
        `?where=PLOT_NUMBER%3D%27${plotNumber}%27&outFields=*&returnGeometry=true&outSR=4326&f=geojson`;
      const r = await fetch(polyUrl, { cache: 'no-store' });
      if (r.ok) {
        const j = (await r.json()) as { features?: PolyFeature[] };
        const feat = j.features?.[0];
        if (feat?.geometry) {
          geometry = feat.geometry;
          district = (feat.properties.PROJECT_NAME as string) ?? district;
          areaSqft =
            typeof feat.properties.AREA_SQFT === 'number'
              ? (feat.properties.AREA_SQFT as number)
              : 0;
          const ring = feat.geometry.coordinates[0];
          lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
          lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
        }
      }
    } catch {
      /* enrichment is best-effort */
    }
  }

  // System owner — until per-user auth lands.
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

  try {
    const parcel = await prisma.parcel.upsert({
      where: {
        emirate_district_plotNumber: { emirate: 'Dubai', district, plotNumber },
      },
      create: {
        plotNumber,
        ownerId: SYSTEM_USER_ID,
        area: areaSqft,
        emirate: 'Dubai',
        district,
        latitude: lat,
        longitude: lng,
        geometry: (geometry as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        status: ParcelStatus.PENDING_REVIEW,
        currentValuation: askingPrice > 0 ? priceFils : null,
      },
      update: {
        status: ParcelStatus.PENDING_REVIEW,
        currentValuation: askingPrice > 0 ? priceFils : null,
      },
    });

    // Submission metadata stored in AffectionPlan.notes (lightweight) +
    // landUseMix so the calc + 3D model still work.
    const submissionPayload = {
      flow,
      broker: body.broker ?? null,
      owner: body.owner ?? null,
      description: body.description ?? null,
      askingPriceAed: askingPrice,
      submittedAt: new Date().toISOString(),
    };

    await prisma.affectionPlan.deleteMany({ where: { parcelId: parcel.id } });
    await prisma.affectionPlan.create({
      data: {
        parcelId: parcel.id,
        source: `submission:${flow}`,
        plotNumber,
        community: district,
        plotAreaSqft: areaSqft || null,
        landUseMix: body.landUse
          ? ([{ category: body.landUse, sub: body.landUse, areaSqm: null }] as unknown as Prisma.InputJsonValue)
          : ([] as unknown as Prisma.InputJsonValue),
        notes: body.description ?? null,
        raw: submissionPayload as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ id: parcel.id, status: parcel.status });
  } catch (e) {
    console.error('[parcels/submit] failed:', e);
    return NextResponse.json({ error: 'submit_failed' }, { status: 500 });
  }
}
