import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { getApprovedUserId } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

/**
 * Legacy ambassador-application linkage — DORMANT per spec-05 §13.4.
 *
 * The Ambassador system was removed in Step 2 (commits 9c0c845 +
 * e266c96 + e050861); src/lib/ambassador.ts no longer exists. The
 * AmbassadorApplication / Commission / ReferralClick tables and the
 * User.ambassadorActive / referralCode / referredById columns are
 * intentionally preserved per spec §13.4 so any pre-cohort APPROVED
 * application rows stay linkable when the matching email signs in.
 *
 * Runs every sync, no-op unless there's an APPROVED row with the
 * matching email + null linkedUserId. Errors swallowed — the sync
 * response must always succeed.
 */
async function linkApprovedApplication(userId: string, email: string): Promise<void> {
  try {
    const app = await prisma.ambassadorApplication.findFirst({
      where: {
        email: email.toLowerCase(),
        status: "APPROVED",
        linkedUserId: null,
        referralCode: { not: null },
      },
      select: { id: true, referralCode: true },
    });
    if (!app || !app.referralCode) return;

    // Both writes in one transaction so linkedUserId + user.referralCode
    // stay consistent. If either side already has a different code,
    // prefer the application's (admin-assigned) code.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          referralCode: app.referralCode,
          ambassadorActive: true,
        },
      }),
      prisma.ambassadorApplication.update({
        where: { id: app.id },
        data: {
          status: "ACTIVE",
          linkedUserId: userId,
        },
      }),
    ]);
  } catch (e) {
    // Swallow — the sync itself must not fail because of a link error.
    // Common expected cause: user.referralCode @unique collision if the
    // user already had one assigned before application was approved.
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[users/sync] ambassador application link skipped:", msg);
  }
}

/**
 * POST /api/users/sync
 * Called by the client right after supabase.auth.signUp succeeds.
 * Creates (or updates) the matching row in our Prisma `User` table.
 *
 * Body: { role, name, phone? }
 * Auth: Bearer <supabase access_token>
 */
export async function POST(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const auth = req.headers.get('authorization')!;
  const token = auth.split(' ')[1];
  const { data: authUser } = await supabase.auth.getUser(token);
  const email = authUser.user?.email;
  if (!email) return NextResponse.json({ error: 'no_email' }, { status: 400 });

  let body: { role?: string; name?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const role = body.role?.toUpperCase();
  if (!role || !(Object.values(UserRole) as string[]).includes(role)) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }
  if (!body.name || body.name.length < 2) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  const user = await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email,
      role: role as UserRole,
      name: body.name,
      phone: body.phone ?? null,
    },
    update: { name: body.name, phone: body.phone ?? null, role: role as UserRole },
  });

  // Auto-link any APPROVED ambassador application matching this email.
  // Dormant in the cohort-pilot era (no new approvals are created), but the
  // table is preserved per spec-05 §13.4 so legacy rows stay linkable.
  // Must run AFTER upsert so there is always a User row to attach to.
  await linkApprovedApplication(userId, email);

  // Activity: USER_LOGIN — fires on every sync call (signin + refresh
  // on already-signed-in sessions). Over-counts slightly vs. pure
  // login events; acceptable for Phase 1 data collection.
  void logActivity({
    userId,
    kind: 'USER_LOGIN',
    payload: { isNewUser: !existing },
  });

  return NextResponse.json(user, { status: 201 });
}
