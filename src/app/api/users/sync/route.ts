import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { getApprovedUserId } from '@/lib/auth';
import { resolveReferrer, wouldCreateCycle } from '@/lib/ambassador';
import { logActivity } from '@/lib/activity';

/**
 * If this user's email matches an APPROVED ambassador application that
 * hasn't been linked to a user row yet, hook them up: copy the
 * application's referralCode onto the User row, flip ambassadorActive=true,
 * record linkedUserId on the application and move it into ACTIVE status.
 *
 * Runs every sync but is a no-op unless there's an APPROVED app with
 * matching email and null linkedUserId. Errors are swallowed — the
 * sync response must always succeed.
 *
 * Note: the schema adds admin-review fields on AmbassadorApplication
 * (approvedBy, linkedUserId, etc., commit 4af728c). There is no
 * `AMBASSADOR` value in the UserRole enum — instead we use the existing
 * User.ambassadorActive boolean as the activation signal (matches
 * activateAmbassador() in src/lib/ambassador.ts and the rest of the
 * codebase).
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

  // Check for a referral cookie set by /r/[code]. Referral attribution
  // happens ONCE at User creation — never on updates. If the user already
  // exists (returning approval flow), we don't re-link.
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referredById: true },
  });
  const refCode = req.cookies.get('zaahi_ref')?.value;
  let referredById: string | null = null;
  if (!existing && refCode) {
    const referrer = await resolveReferrer(prisma, refCode.toUpperCase());
    if (referrer && referrer.id !== userId) {
      const cycles = await wouldCreateCycle(prisma, userId, referrer.id);
      if (!cycles) referredById = referrer.id;
    }
  }

  const user = await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email,
      role: role as UserRole,
      name: body.name,
      phone: body.phone ?? null,
      ...(referredById
        ? { referredById, referredAt: new Date() }
        : {}),
    },
    update: { name: body.name, phone: body.phone ?? null, role: role as UserRole },
  });

  // Attribute the click in ReferralClick table (best-effort, non-blocking)
  if (referredById && refCode) {
    await prisma.referralClick.create({
      data: {
        referralCode: refCode.toUpperCase(),
        convertedToUserId: userId,
      },
    }).catch(() => {});
  }

  // Auto-link any APPROVED ambassador application matching this email.
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

  const res = NextResponse.json(user, { status: 201 });
  // Clear the cookie regardless of outcome so subsequent signups don't reuse it
  if (refCode) {
    res.cookies.set('zaahi_ref', '', { maxAge: 0, path: '/' });
  }
  return res;
}
