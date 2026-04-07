import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchPlotDetailsPdf } from '@/lib/dda';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/parcels/:id/pdf  → proxies the official DDA Plot Details PDF.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const parcel = await prisma.parcel.findUnique({
    where: { id },
    select: { plotNumber: true },
  });
  if (!parcel) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const buf = await fetchPlotDetailsPdf(parcel.plotNumber);
  return new NextResponse(buf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${parcel.plotNumber}-plot-details.pdf"`,
    },
  });
}
