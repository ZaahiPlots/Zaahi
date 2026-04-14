import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { getApprovedUserId } from '@/lib/auth';
import { resolveReferrer, wouldCreateCycle } from '@/lib/ambassador';

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

  const res = NextResponse.json(user, { status: 201 });
  // Clear the cookie regardless of outcome so subsequent signups don't reuse it
  if (refCode) {
    res.cookies.set('zaahi_ref', '', { maxAge: 0, path: '/' });
  }
  return res;
}
