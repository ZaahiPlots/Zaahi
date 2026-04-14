import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';
import { getAmbassadorStats } from '@/lib/ambassador';

/**
 * GET /api/ambassador/stats
 * Returns ambassador overview for the dashboard:
 *   - referralCode, ambassadorActive
 *   - downline counts L1/L2/L3
 *   - earnings (pending / paid / total / last 30 days) — BigInt as string
 */
export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const stats = await getAmbassadorStats(prisma, userId);
    return NextResponse.json(stats);
  } catch (e) {
    console.error('[ambassador/stats]', e);
    return NextResponse.json({ error: 'stats_failed' }, { status: 500 });
  }
}
