import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge middleware: every /api/* request must carry a Bearer token, except
 * the auth endpoints themselves and public read-only routes.
 *
 * We do NOT verify the token here (that needs Supabase SDK = Node runtime).
 * We only enforce its presence; route handlers call getSessionUserId() to
 * actually verify and extract the user id.
 */
const PUBLIC_API = [
  '/api/auth',          // not used yet — Supabase handles auth on the client
  '/api/users/sync',    // requires auth, but checks token in handler
  '/api/chat',          // Archibald AI assistant — public for now (TODO: rate-limit by IP)
  '/api/parcels/seed-dda', // Add Plot launcher — public until admin auth lands
];

const PUBLIC_READS = new Set(['GET']);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/api/')) return NextResponse.next();
  if (PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Allow unauthenticated GETs on parcels list / detail (browsing).
  if (PUBLIC_READS.has(req.method) && pathname.startsWith('/api/parcels')) {
    return NextResponse.next();
  }
  // Public basemap / overlay layers (community boundaries, etc.).
  if (PUBLIC_READS.has(req.method) && pathname.startsWith('/api/layers')) {
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
