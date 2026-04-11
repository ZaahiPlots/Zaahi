import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/parcels/:id/plot-guidelines
 *
 * Proxies the per-parcel "Plot Guidelines" PDF that DDA's plot info
 * page exposes via a Salesforce link. The URL itself is stored on the
 * latest AffectionPlan as `plotGuidelinesUrl` (backfilled from DDA's
 * HTML by scripts/backfill-plot-guidelines.ts).
 *
 * We proxy rather than redirecting so the front-end can use the same
 * `apiFetch` + `downloadFile` flow as the existing /pdf endpoint, with
 * the Bearer token attached and a clean filename for the save dialog.
 *
 * The Salesforce endpoint itself is publicly accessible — no DDA auth
 * required — but we still gate access on `getApprovedUserId` so an
 * unauthenticated visitor can't enumerate parcel guidelines through
 * our API.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const parcel = await prisma.parcel.findUnique({
    where: { id },
    select: {
      plotNumber: true,
      affectionPlans: {
        orderBy: { fetchedAt: 'desc' },
        take: 1,
        select: { plotGuidelinesUrl: true },
      },
    },
  });
  if (!parcel) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const url = parcel.affectionPlans[0]?.plotGuidelinesUrl;
  if (!url) return NextResponse.json({ error: 'no_plot_guidelines' }, { status: 404 });

  // Proxy the upstream PDF.
  const upstream = await fetch(url, { cache: 'no-store' });
  if (!upstream.ok) {
    return NextResponse.json(
      { error: 'upstream_failed', detail: `HTTP ${upstream.status}` },
      { status: 502 },
    );
  }
  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/pdf',
      'content-disposition': `inline; filename="${parcel.plotNumber}-plot-guidelines.pdf"`,
      'cache-control': 'no-store',
    },
  });
}
