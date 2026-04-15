import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ParcelStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { getApprovedUserId } from '@/lib/auth';

export const runtime = 'nodejs';

interface PolyFeature {
  geometry: GeoJSON.Polygon;
  properties: Record<string, unknown>;
}

const UploadedDoc = z.object({
  kind: z.enum(['title_deed', 'id_doc', 'rera_contract']),
  url: z.string().url().max(1024),
  name: z.string().max(256),
  size: z.number().int().nonnegative().max(10 * 1024 * 1024).optional(),
  contentType: z.string().max(128).optional(),
});

const SubmitSchema = z
  .object({
    plotNumber: z.string().trim().regex(/^\d{5,10}$/, 'plotNumber must be 5-10 digits'),
    askingPriceAed: z
      .number()
      .positive('asking_price_must_be_positive')
      .max(1e13, 'asking_price_too_large'),
    landUse: z.string().trim().min(1).max(64).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    flow: z.enum(['broker', 'owner']),
    broker: z
      .object({
        reraPermit: z.string().trim().min(1).max(64),
        contractRef: z.string().trim().max(256).nullable().optional(),
      })
      .optional(),
    owner: z
      .object({
        fullName: z.string().trim().min(2).max(128),
        phone: z
          .string()
          .trim()
          .regex(/^\+?[0-9\s-]{7,20}$/, 'invalid_phone'),
        email: z.string().trim().email('invalid_email').optional().or(z.literal('')),
        titleDeedNumber: z.string().trim().max(64).nullable().optional(),
      })
      .optional(),
    documents: z.array(UploadedDoc).max(10).optional(),
  })
  .refine((d) => d.flow !== 'broker' || !!d.broker?.reraPermit, {
    message: 'rera_permit_required',
    path: ['broker', 'reraPermit'],
  })
  .refine((d) => d.flow !== 'owner' || !!(d.owner?.fullName && d.owner?.phone), {
    message: 'owner_contact_required',
    path: ['owner'],
  });

/**
 * POST /api/parcels/submit
 *
 * Listing submission (Broker or Owner flow). Creates a Parcel with
 * status = PENDING_REVIEW so it stays hidden from the public map until
 * an admin verifies the documents. The parcel is owned by the caller —
 * not a system user — so the submitter can later edit price / status
 * and so ambassador commissions attribute correctly when it sells.
 */
export async function POST(req: NextRequest) {
  const callerId = await getApprovedUserId(req);
  if (!callerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = SubmitSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.issues.slice(0, 10) },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const { plotNumber, flow } = body;
  const askingPrice = body.askingPriceAed;
  const priceFils = BigInt(Math.round(askingPrice)) * BigInt(100);

  // Best-effort enrichment from DDA GIS for 5+ digit plot numbers.
  let geometry: GeoJSON.Polygon | null = null;
  let district = 'UNKNOWN';
  let areaSqft = 0;
  let lng: number | null = null;
  let lat: number | null = null;
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
        areaSqft = typeof feat.properties.AREA_SQFT === 'number' ? feat.properties.AREA_SQFT : 0;
        const ring = feat.geometry.coordinates[0];
        lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
        lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
      }
    }
  } catch {
    /* enrichment is best-effort */
  }

  // Ensure the caller has a User row before we write a Parcel that
  // references ownerId. The caller is already Supabase-authenticated and
  // `approved=true` (getApprovedUserId verified it) but may not have
  // synced yet. Upsert defensively — reuse the email / role from
  // Supabase auth metadata.
  try {
    const authRes = await supabase.auth.getUser(
      req.headers.get('authorization')?.split(' ')[1] ?? '',
    );
    const email = authRes.data.user?.email;
    if (!email) {
      return NextResponse.json({ error: 'no_email' }, { status: 400 });
    }
    const metaRole = (authRes.data.user?.user_metadata?.role as string | undefined)?.toUpperCase();
    const role = (Object.values(UserRole) as string[]).includes(metaRole ?? '')
      ? (metaRole as UserRole)
      : flow === 'broker'
        ? UserRole.BROKER
        : UserRole.OWNER;
    const metaName = (authRes.data.user?.user_metadata?.name as string | undefined) ?? email.split('@')[0];
    await prisma.user.upsert({
      where: { id: callerId },
      create: { id: callerId, email, role, name: metaName },
      update: {},
    });
  } catch (e) {
    console.error('[parcels/submit] user upsert failed:', e);
    return NextResponse.json({ error: 'user_sync_failed' }, { status: 500 });
  }

  try {
    const parcel = await prisma.parcel.upsert({
      where: {
        emirate_district_plotNumber: { emirate: 'Dubai', district, plotNumber },
      },
      create: {
        plotNumber,
        ownerId: callerId,
        area: areaSqft,
        emirate: 'Dubai',
        district,
        latitude: lat,
        longitude: lng,
        geometry: (geometry as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        status: ParcelStatus.PENDING_REVIEW,
        currentValuation: priceFils,
      },
      // Only bump price + status on update. DO NOT overwrite ownerId — a
      // parcel is never re-assigned through a submit flow.
      update: {
        status: ParcelStatus.PENDING_REVIEW,
        currentValuation: priceFils,
      },
    });

    // Submission metadata: flow, role payload, description, uploaded
    // document URLs (Supabase Storage). Stored on a FRESH AffectionPlan
    // row — never delete existing rows (CLAUDE.md "never deleteMany").
    const submissionPayload = {
      flow,
      broker: body.broker ?? null,
      owner: body.owner ?? null,
      description: body.description ?? null,
      askingPriceAed: askingPrice,
      documents: body.documents ?? [],
      submittedAt: new Date().toISOString(),
      submittedBy: callerId,
    };

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
