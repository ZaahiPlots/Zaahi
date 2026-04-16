// ── /api/me — current user profile (GET + PATCH) ────────────────────
// The dashboard's Profile form hydrates from GET and persists via PATCH.
// Only the authenticated user can read/write their own row.
//
// PATCH body fields are all optional. Unknown fields are rejected by Zod
// so a typo doesn't silently drop data. Sensitive / immutable fields
// (id, email, role, referralCode, referredById, ambassadorActive) are
// NOT writable here — `role` changes go through a separate admin flow,
// ambassador activation through /api/ambassador/activate.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

const ProfilePatchSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  avatarUrl: z.string().url().max(500).nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  timezone: z.string().trim().max(60).nullable().optional(),
  language: z.enum(["EN", "AR", "RU", "UK", "SQ", "FR"]).nullable().optional(),
  currency: z.enum(["AED", "USD", "EUR"]).nullable().optional(),
  companyName: z.string().trim().max(200).nullable().optional(),
  reraLicense: z.string().trim().max(60).nullable().optional(),
  brnNumber: z.string().trim().max(60).nullable().optional(),
  // notificationPrefs — Phase 6 feature (email/push delivery). Omitted
  // from the PATCH surface here so we don't have to juggle Prisma.JsonNull.
}).strict();

export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, role: true, name: true, phone: true,
      createdAt: true,
      avatarUrl: true, bio: true, timezone: true, language: true,
      currency: true, companyName: true, reraLicense: true, brnNumber: true,
      lastSeenAt: true, notificationPrefs: true, onboardingCompleted: true,
      referralCode: true, ambassadorActive: true,
    },
  });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Best-effort lastSeenAt refresh. Swallow errors.
  prisma.user.update({
    where: { id: userId },
    data: { lastSeenAt: new Date() },
  }).catch(() => { /* ignore */ });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = ProfilePatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }
  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "empty_body" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true, email: true, role: true, name: true, phone: true,
      avatarUrl: true, bio: true, timezone: true, language: true,
      currency: true, companyName: true, reraLicense: true, brnNumber: true,
      notificationPrefs: true, onboardingCompleted: true,
    },
  });

  return NextResponse.json(updated);
}
