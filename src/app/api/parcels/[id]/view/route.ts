// POST /api/parcels/:id/view
// Appends a ParcelView row. Called by the map SidePanel and parcel
// detail page whenever a user opens a parcel. The client is expected
// to debounce (one view per parcel per session), but the server also
// throttles: if the same (userId, parcelId) was recorded < 30s ago,
// this call is a no-op so refreshes don't inflate counts.
//
// Auth is required — anonymous views are NOT logged here (viewer must
// be approved). If we ever expose public parcel views we can change
// this to getSessionUserId() or allow null userId.

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const THROTTLE_SECONDS = 30;

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.REFERRAL_IP_SALT || "zaahi-default-salt";
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: parcelId } = await params;
  if (!parcelId) return NextResponse.json({ error: "missing_parcel_id" }, { status: 400 });

  // Verify parcel exists + OWNER check — owners viewing own plot don't
  // count. (Keeps analytics honest.)
  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    select: { id: true, ownerId: true },
  });
  if (!parcel) return NextResponse.json({ error: "parcel_not_found" }, { status: 404 });
  if (parcel.ownerId === userId) {
    return NextResponse.json({ recorded: false, reason: "self" });
  }

  // 30-second throttle per (user, parcel). Prevents refresh spam.
  const cutoff = new Date(Date.now() - THROTTLE_SECONDS * 1000);
  const recent = await prisma.parcelView.findFirst({
    where: { parcelId, userId, viewedAt: { gt: cutoff } },
    select: { id: true },
  });
  if (recent) {
    return NextResponse.json({ recorded: false, reason: "throttled" });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;

  await prisma.parcelView.create({
    data: {
      parcelId,
      userId,
      ipHash: hashIp(ip),
      userAgent,
    },
  });

  return NextResponse.json({ recorded: true });
}
