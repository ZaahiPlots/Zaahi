import { NextRequest, NextResponse } from 'next/server';
import { ParcelStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminUserId } from '@/lib/auth';

export const runtime = 'nodejs';

function serialize<T>(v: T): T {
  return JSON.parse(JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? x.toString() : x)));
}

/**
 * GET /api/parcels/pending — admin queue of submissions awaiting review.
 *
 * Returns parcels with `status === PENDING_REVIEW` plus the latest
 * AffectionPlan (carries flow, submitter metadata, document URLs).
 * Gated by {@link getAdminUserId} — only ADMIN role or founder emails.
 */
export async function GET(req: NextRequest) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parcels = await prisma.parcel.findMany({
    where: { status: ParcelStatus.PENDING_REVIEW },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      plotNumber: true,
      district: true,
      emirate: true,
      area: true,
      currentValuation: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      ownerId: true,
      owner: { select: { id: true, email: true, name: true, role: true } },
      affectionPlans: {
        orderBy: { fetchedAt: 'desc' },
        take: 1,
        select: {
          source: true,
          fetchedAt: true,
          landUseMix: true,
          notes: true,
          raw: true,
        },
      },
    },
  });

  return NextResponse.json(serialize({ items: parcels, count: parcels.length }));
}
