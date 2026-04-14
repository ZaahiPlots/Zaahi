import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { resolveReferrer, hashIp } from '@/lib/ambassador';
import { headers } from 'next/headers';

/**
 * /r/[code] — Referral landing page.
 *
 * Sets a `zaahi_ref` cookie (30 days) with the referral code and
 * redirects to the auth page. The cookie is consumed by /api/users/sync
 * on first signup to attribute the new user to the referrer.
 *
 * No PII exposed. Invalid codes just redirect home without side effects.
 */
export default async function ReferralLanding({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (!/^[A-Z0-9]{8}$/.test(normalized)) {
    redirect('/');
  }

  const referrer = await resolveReferrer(prisma, normalized);
  if (!referrer) {
    // Invalid or inactive code — just redirect without setting cookie
    redirect('/');
  }

  // Set cookie (30 days). httpOnly — only the server (/api/users/sync)
  // needs to read this. Preventing JS access limits XSS blast radius
  // (referral attribution cannot be stolen or manipulated by injected
  // scripts). Client UI that wants to show "Invited by X" should fetch
  // a server endpoint, not read the cookie directly.
  const cookieStore = await cookies();
  cookieStore.set('zaahi_ref', normalized, {
    maxAge: 30 * 24 * 3600,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });

  // Fire-and-forget click tracking (don't block redirect on DB errors)
  try {
    const hdrs = await headers();
    const ip = (hdrs.get('x-forwarded-for') ?? '').split(',')[0].trim() || hdrs.get('x-real-ip') || '';
    const ua = hdrs.get('user-agent') ?? null;
    await prisma.referralClick.create({
      data: {
        referralCode: normalized,
        ipHash: ip ? hashIp(ip) : null,
        userAgent: ua,
      },
    });
  } catch {
    // swallow — analytics are best-effort
  }

  redirect('/');
}
