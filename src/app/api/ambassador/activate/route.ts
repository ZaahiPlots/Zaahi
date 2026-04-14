import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';
import { activateAmbassador } from '@/lib/ambassador';

/**
 * POST /api/ambassador/activate
 * Activate ambassador mode for the current user. Generates a unique
 * 8-char referralCode if needed. Idempotent.
 * Returns: { referralCode, ambassadorActive: true }
 */
export async function POST(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const code = await activateAmbassador(prisma, userId);
    return NextResponse.json({ referralCode: code, ambassadorActive: true });
  } catch (e) {
    console.error('[ambassador/activate]', e);
    return NextResponse.json({ error: 'activation_failed' }, { status: 500 });
  }
}
