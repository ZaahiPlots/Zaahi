// POST /api/me/complete-onboarding
// Flips User.onboardingCompleted=true. Called by the welcome tour on
// finish/skip. Idempotent.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompleted: true },
  });

  return NextResponse.json({ ok: true });
}
