import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';

/**
 * GET /api/ambassador/commissions
 * Returns commission history for the current ambassador.
 *
 * Query params:
 *   status: PENDING | PAID | REVERSED (optional, default all)
 *   level:  1 | 2 | 3 (optional)
 *   limit:  default 100, max 500
 */
export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const levelRaw = url.searchParams.get('level');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500);

  const where: {
    ambassadorId: string;
    status?: 'PENDING' | 'PAID' | 'REVERSED';
    level?: number;
  } = { ambassadorId: userId };
  if (status === 'PENDING' || status === 'PAID' || status === 'REVERSED') {
    where.status = status;
  }
  if (levelRaw) {
    const n = parseInt(levelRaw, 10);
    if (n === 1 || n === 2 || n === 3) where.level = n;
  }

  try {
    const rows = await prisma.commission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        dealId: true,
        level: true,
        amountFils: true,
        basisFils: true,
        rate: true,
        status: true,
        createdAt: true,
        paidAt: true,
      },
    });
    // Serialize BigInt to string
    const items = rows.map((r) => ({
      ...r,
      amountFils: r.amountFils.toString(),
      basisFils: r.basisFils.toString(),
      rate: r.rate.toString(),
      createdAt: r.createdAt.toISOString(),
      paidAt: r.paidAt?.toISOString() ?? null,
    }));
    return NextResponse.json({ items, count: items.length });
  } catch (e) {
    console.error('[ambassador/commissions]', e);
    return NextResponse.json({ error: 'commissions_failed' }, { status: 500 });
  }
}
