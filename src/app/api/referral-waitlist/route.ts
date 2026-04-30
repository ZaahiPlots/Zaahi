/**
 * POST /api/referral-waitlist — public, anti-spam-rate-limited.
 *
 * PUBLIC route — listed in `PUBLIC_API` of `src/middleware.ts`. Justification:
 * the /refer page is a Coming Soon landing for the referral program (Phase A),
 * served to unauthenticated visitors. The endpoint accepts a single field
 * (email) to add to the waitlist; no PII other than the opt-in email is
 * collected. We hash the client IP into `ipHash` for rate-limit + anti-spam
 * accounting; the raw IP is never stored.
 *
 * Returns:
 *   201 { ok: true }              — inserted
 *   409 { error: 'duplicate' }    — email already on waitlist
 *   429 { error: 'rate_limited' } — > 3 requests / hour from same ipHash
 *   400 { error: 'invalid_email' } | { error: 'invalid_json' }
 *   500 { error: 'internal' }
 */
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3;
// RFC 5322-ish lite — enough to reject obvious garbage. Real validation
// happens at delivery time (we'll send a confirmation later).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "0.0.0.0";
  const salt = process.env.REFERRAL_IP_SALT ?? "zaahi-default-salt";
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!rawEmail || rawEmail.length > 254 || !EMAIL_RE.test(rawEmail)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const ipHash = hashIp(req);

  try {
    // Rate limit per ipHash within window.
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recent = await prisma.referralWaitlist.count({
      where: { ipHash, createdAt: { gte: since } },
    });
    if (recent >= RATE_LIMIT_MAX) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    await prisma.referralWaitlist.create({
      data: { email: rawEmail, ipHash },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    console.error("[referral-waitlist] insert failed:", err?.message ?? e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
