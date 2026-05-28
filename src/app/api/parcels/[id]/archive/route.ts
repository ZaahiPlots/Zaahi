import { NextRequest, NextResponse } from 'next/server';
import { ParcelStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId, getAdminUserId } from '@/lib/auth';

// PATCH /api/parcels/:id/archive  — move a parcel into FROZEN status.
//
// Authorisation: the immutable creator (`ownerId`), the currently
// verified owner (`verifiedOwnerUserId`), OR an ADMIN may archive a
// listing. Owner gate mirrors the existing /api/parcels/[id] PATCH so
// the rules stay consistent across endpoints; admin gate is added so
// the moderation team can hide bad rows without owner cooperation.
//
// FROZEN is a soft-archive: the row stays in the database (CLAUDE.md
// "NEVER delete parcels — ever"), it just disappears from the public
// map (status filter LISTED|VERIFIED|IN_DEAL in /api/parcels/map) and
// renders dimmed in dashboards.

function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
  );
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.parcel.findUnique({
    where: { id },
    select: { ownerId: true, verifiedOwnerUserId: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const isOwner =
    existing.ownerId === userId || existing.verifiedOwnerUserId === userId;
  let allowed = isOwner;
  if (!allowed) {
    const adminId = await getAdminUserId(req);
    allowed = !!adminId && adminId === userId;
  }
  if (!allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  if (existing.status === ParcelStatus.FROZEN) {
    // Idempotent — already archived.
    return NextResponse.json({ id, status: ParcelStatus.FROZEN, noop: true });
  }

  const updated = await prisma.parcel.update({
    where: { id },
    data: { status: ParcelStatus.FROZEN },
  });
  return NextResponse.json(serialize(updated));
}
