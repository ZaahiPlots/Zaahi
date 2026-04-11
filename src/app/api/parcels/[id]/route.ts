import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ParcelStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';

function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
  );
}

type Ctx = { params: Promise<{ id: string }> };

// GET /api/parcels/:id  → parcel + latest affection plan
export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const parcel = await prisma.parcel.findUnique({
    where: { id },
    include: { affectionPlans: { orderBy: { fetchedAt: 'desc' }, take: 1 } },
  });
  if (!parcel) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(serialize(parcel));
}

// PATCH /api/parcels/:id  — only the owner can update.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.parcel.findUnique({ where: { id }, select: { ownerId: true } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.ownerId !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Whitelist of mutable fields. ownerId / plotNumber identity stays out.
  const data: Prisma.ParcelUpdateInput = {};
  if (typeof body.area === 'number' && body.area > 0) data.area = body.area;
  if (typeof body.emirate === 'string') data.emirate = body.emirate;
  if (typeof body.district === 'string') data.district = body.district;
  if (typeof body.latitude === 'number') data.latitude = body.latitude;
  if (typeof body.longitude === 'number') data.longitude = body.longitude;
  if (body.geometry !== undefined) data.geometry = body.geometry as Prisma.InputJsonValue;
  if (typeof body.isTokenized === 'boolean') data.isTokenized = body.isTokenized;
  if (typeof body.status === 'string' && (Object.values(ParcelStatus) as string[]).includes(body.status)) {
    data.status = body.status as ParcelStatus;
  }
  if (body.currentValuation != null) {
    data.currentValuation = BigInt(body.currentValuation as string | number);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'no_updatable_fields' }, { status: 400 });
  }

  const updated = await prisma.parcel.update({ where: { id }, data });
  return NextResponse.json(serialize(updated));
}

// DELETE /api/parcels/:id  — only the owner.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.parcel.findUnique({ where: { id }, select: { ownerId: true } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.ownerId !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await prisma.parcel.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
