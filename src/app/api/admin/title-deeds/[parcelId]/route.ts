// GET /api/admin/title-deeds/[parcelId] — detail for one Title Deed
// verification candidate. Returns parcel + all PENDING OWNER claims +
// signed Title Deed documents per claim (TTL 7d for registration-docs
// bucket; ready URLs for legacy `documents` bucket per Step 9 mixed-
// bucket comment).
//
// Auth: getAdminUserId.

import { NextRequest, NextResponse } from "next/server";
import { ClaimStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { signClaimDocuments } from "@/lib/plot-claim-docs";
import { serialize } from "@/lib/serialize";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ parcelId: string }> },
) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { parcelId } = await ctx.params;

  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    include: {
      affectionPlans: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
        select: { projectName: true, plotAreaSqft: true, landUseMix: true, community: true, masterDeveloper: true },
      },
      owner: {
        select: { id: true, nickname: true, name: true, email: true, role: true },
      },
    },
  });
  if (!parcel) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // All OWNER claims on this parcel — show PENDING (action targets) +
  // any historical VERIFIED (read-only context) + REJECTED if any.
  const claims = await prisma.plotClaim.findMany({
    where: { parcelId, roleAtClaim: UserRole.OWNER },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      priceAed: true,
      status: true,
      createdAt: true,
      verifiedAt: true,
      rejectionReason: true,
      documentsJson: true,
      user: {
        select: { id: true, nickname: true, name: true, email: true, role: true },
      },
    },
  });

  const claimsWithDocs = await Promise.all(
    claims.map(async (c) => ({
      id: c.id,
      userId: c.userId,
      priceAed: c.priceAed,
      status: c.status,
      createdAt: c.createdAt,
      verifiedAt: c.verifiedAt,
      rejectionReason: c.rejectionReason,
      user: c.user,
      documents: await signClaimDocuments(c.documentsJson),
    })),
  );

  // Convenience: surface whether ANY pending OWNER claim is actionable.
  const pendingCount = claims.filter((c) => c.status === ClaimStatus.PENDING).length;

  return NextResponse.json(
    serialize({
      parcel: {
        id: parcel.id,
        plotNumber: parcel.plotNumber,
        emirate: parcel.emirate,
        district: parcel.district,
        projectName: parcel.affectionPlans[0]?.projectName ?? parcel.district,
        plotAreaSqft: parcel.affectionPlans[0]?.plotAreaSqft ?? null,
        community: parcel.affectionPlans[0]?.community ?? null,
        masterDeveloper: parcel.affectionPlans[0]?.masterDeveloper ?? null,
        ownerId: parcel.ownerId,
        creator: parcel.owner,
        verifiedOwnerUserId: parcel.verifiedOwnerUserId,
        verifiedAt: parcel.verifiedAt,
      },
      claims: claimsWithDocs,
      pendingCount,
    }),
  );
}
