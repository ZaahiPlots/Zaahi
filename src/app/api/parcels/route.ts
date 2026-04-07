import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ParcelStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/auth';

// BigInt isn't JSON-serializable by default.
function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
  );
}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

// GET /api/parcels?emirate=Dubai&district=Marina&page=1&pageSize=20
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const emirate = sp.get('emirate') ?? undefined;
  const district = sp.get('district') ?? undefined;
  const ownerId = sp.get('ownerId') ?? undefined;
  const status = sp.get('status') as ParcelStatus | null;

  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(sp.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );

  const where: Prisma.ParcelWhereInput = {
    ...(emirate && { emirate }),
    ...(district && { district }),
    ...(ownerId && { ownerId }),
    ...(status && { status }),
  };

  const [items, total] = await Promise.all([
    prisma.parcel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.parcel.count({ where }),
  ]);

  return NextResponse.json(
    serialize({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) }),
  );
}

// POST /api/parcels
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { plotNumber, area, emirate, district, latitude, longitude, geometry, currentValuation } = body as {
    plotNumber?: string;
    area?: number;
    emirate?: string;
    district?: string;
    latitude?: number;
    longitude?: number;
    geometry?: unknown;
    currentValuation?: string | number;
  };

  if (!plotNumber || typeof plotNumber !== 'string') {
    return NextResponse.json({ error: 'plotNumber required' }, { status: 400 });
  }
  if (typeof area !== 'number' || area <= 0) {
    return NextResponse.json({ error: 'area must be a positive number (sqft)' }, { status: 400 });
  }
  if (!emirate || !district) {
    return NextResponse.json({ error: 'emirate and district required' }, { status: 400 });
  }

  try {
    const parcel = await prisma.parcel.create({
      data: {
        plotNumber,
        area,
        emirate,
        district,
        ownerId: userId,
        latitude: typeof latitude === 'number' ? latitude : null,
        longitude: typeof longitude === 'number' ? longitude : null,
        geometry: (geometry as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        currentValuation:
          currentValuation != null ? BigInt(currentValuation) : null,
      },
    });
    return NextResponse.json(serialize(parcel), { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return NextResponse.json(
          { error: 'plotNumber already exists in this district' },
          { status: 409 },
        );
      }
      if (e.code === 'P2003') {
        return NextResponse.json({ error: 'owner not found' }, { status: 400 });
      }
    }
    throw e;
  }
}
