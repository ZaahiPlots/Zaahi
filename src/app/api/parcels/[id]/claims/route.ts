// GET /api/parcels/[id]/claims
//
// Lists the public-facing PlotClaims on a parcel. Used by:
//   * AddPlotModal Path C view — render existing claimants + status pills
//     before showing the "Add your claim" form.
//   * /parcels/[id] detail SidePanel (Step 11 PDPL surface) — same shape.
//
// PDPL contract (spec §12.5 / §5.4.1 LOCK-8):
//   * Only nicknames + role + price + status are returned.
//   * Real names, emails, phones are NEVER serialised here.
//   * Dormant ADMIN system-seed claims (one per backfilled parcel) are
//     filtered out — they're bookkeeping, not claims to render.
//   * REJECTED claims are filtered out — failed verifications are not
//     public history; the claimant alone sees their REJECTED state in
//     /dashboard (Phase 1).
//
// Auth: getApprovedUserId. Anonymous reads are forbidden because
// the parcel detail surfaces themselves are auth-gated cohort-only.

import { NextRequest, NextResponse } from "next/server";
import { ClaimStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { serialize, serializeUserPublic } from "@/lib/serialize";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const parcel = await prisma.parcel.findUnique({
    where: { id },
    select: { id: true, plotNumber: true, district: true, verifiedOwnerUserId: true },
  });
  if (!parcel) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const claims = await prisma.plotClaim.findMany({
    where: {
      parcelId: id,
      roleAtClaim: { not: "ADMIN" },
      status: { not: ClaimStatus.REJECTED },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      roleAtClaim: true,
      priceAed: true,
      status: true,
      verifiedAt: true,
      createdAt: true,
      userId: true,
      user: {
        select: {
          id: true,
          nickname: true,
          role: true,
          avatarUrl: true,
          companyName: true,
          reraLicense: true,
        },
      },
    },
  });

  const items = claims.map((c) => ({
    id: c.id,
    role: c.roleAtClaim,
    priceAed: c.priceAed,
    status: c.status,
    verifiedAt: c.verifiedAt,
    createdAt: c.createdAt,
    isVerifiedOwner: parcel.verifiedOwnerUserId === c.userId,
    isCaller: c.userId === userId,
    user: serializeUserPublic(c.user),
  }));

  return NextResponse.json(
    serialize({
      parcel: {
        id: parcel.id,
        plotNumber: parcel.plotNumber,
        district: parcel.district,
      },
      claims: items,
    }),
  );
}
