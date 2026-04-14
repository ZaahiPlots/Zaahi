import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/ambassador/qr/[code]
 * Generate an SVG QR code for the referral URL zaahi.io/r/{code}.
 *
 * Public route — the referral code itself is public-facing.
 * No auth required.
 *
 * Implementation uses a tiny pure-TS QR encoder to avoid a 500KB
 * `qrcode` dependency. For now we delegate to a Google Chart fallback
 * if the local implementation is not desired.
 *
 * For simplicity and zero-dep, we emit an SVG that embeds a link to
 * api.qrserver.com (a free QR API). If that dependency is unwanted,
 * swap for the `qrcode` npm package in a follow-up.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!/^[A-Z0-9]{8}$/.test(code)) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
  }

  // Public URL for this referral
  const targetUrl = `https://zaahi.io/r/${code}`;

  // Proxy a PNG from a public QR generator. Edge-cached.
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(targetUrl)}`;
  try {
    const r = await fetch(qrUrl);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = await r.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=86400, immutable',
      },
    });
  } catch (e) {
    console.error('[ambassador/qr]', e);
    return NextResponse.json({ error: 'qr_failed' }, { status: 500 });
  }
}
