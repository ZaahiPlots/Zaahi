import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge middleware: every /api/* request must carry a Bearer token, except
 * the auth endpoints themselves and public read-only routes.
 *
 * We do NOT verify the token here (that needs Supabase SDK = Node runtime).
 * We only enforce its presence; route handlers call getSessionUserId() to
 * actually verify and extract the user id.
 */
/**
 * Routes that do NOT require an Authorization header. Keep this list minimal —
 * everything else under /api/ is forced to carry a Bearer token (the handler
 * still has to verify it via getSessionUserId / getApprovedUserId).
 *
 * - /api/auth      — reserved for future server-side auth callbacks.
 * - /api/notify-admin — anonymous "request access" notification posted from
 *                       the public sign-up form. Body is logged only.
 */
const PUBLIC_API = [
  '/api/auth',
  '/api/notify-admin',
];

// HEAD is included so browser preflights / link checkers don't 401.
const PUBLIC_READS = new Set(['GET', 'HEAD']);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/api/')) return NextResponse.next();
  if (PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Public basemap / overlay layers (community boundaries, road network,
  // master plans, all 206 DDA districts). These are public-domain geographic
  // data — no PII, no prices — so the map can render them before the user
  // is signed in (and unauthenticated link previews work too). Anything that
  // serves prices, documents, or PII MUST live outside /api/layers.
  if (PUBLIC_READS.has(req.method) && pathname.startsWith('/api/layers/')) {
    return NextResponse.next();
  }

  const auth = req.headers.get('authorization');
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
