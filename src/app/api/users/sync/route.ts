import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { getApprovedUserId } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

// Ambassador / referral attribution at signup is paused with the retirement
// of the 3-tier paid Ambassador program (2026-04-30). The new single-tier
// referral program is Coming Soon (/refer); attribution mechanics will be
// reintroduced in Phase B after UAE counsel sign-off.

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
