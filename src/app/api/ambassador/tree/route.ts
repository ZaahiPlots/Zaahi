import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';
import { buildReferralTree } from '@/lib/ambassador';

/**
 * GET /api/ambassador/tree
 * Returns the 3-level downline tree (anonymized — names + join dates only).
 */
export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const tree = await buildReferralTree(prisma, userId, 3);
    return NextResponse.json({ tree });
  } catch (e) {
    console.error('[ambassador/tree]', e);
    return NextResponse.json({ error: 'tree_failed' }, { status: 500 });
  }
}
