// GET /api/admin/plot-claims/[claimId] — detail for one non-OWNER
// PlotClaim awaiting verification. Returns claim + parcel + claimant
// + signed role-specific documents.
//
// Auth: getAdminUserId.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { signClaimDocuments } from "@/lib/plot-claim-docs";
import { serialize } from "@/lib/serialize";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ claimId: string }> },
) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { claimId } = await ctx.params;

  const claim = await prisma.plotClaim.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      userId: true,
      roleAtClaim: true,
      priceAed: true,
      status: true,
      createdAt: true,
      verifiedAt: true,
      verifiedById: true,
      rejectionReason: true,
      documentsJson: true,
      user: {
        select: { id: true, nickname: true, name: true, email: true, role: true },
      },
      parcel: {
        select: {
          id: true,
          plotNumber: true,
          district: true,
          emirate: true,
          ownerId: true,
          verifiedOwnerUserId: true,
          affectionPlans: {
            orderBy: { fetchedAt: "desc" },
            take: 1,
            select: { projectName: true, plotAreaSqft: true, community: true },
          },
        },
      },
    },
  });
  if (!claim) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const documents = await signClaimDocuments(claim.documentsJson);

  return NextResponse.json(
    serialize({
      claim: {
        id: claim.id,
        userId: claim.userId,
        roleAtClaim: claim.roleAtClaim,
        priceAed: claim.priceAed,
        status: claim.status,
        createdAt: claim.createdAt,
        verifiedAt: claim.verifiedAt,
        verifiedById: claim.verifiedById,
        rejectionReason: claim.rejectionReason,
        user: claim.user,
      },
      parcel: {
        id: claim.parcel.id,
        plotNumber: claim.parcel.plotNumber,
        emirate: claim.parcel.emirate,
        district: claim.parcel.district,
        projectName: claim.parcel.affectionPlans[0]?.projectName ?? claim.parcel.district,
        plotAreaSqft: claim.parcel.affectionPlans[0]?.plotAreaSqft ?? null,
        community: claim.parcel.affectionPlans[0]?.community ?? null,
        ownerId: claim.parcel.ownerId,
        verifiedOwnerUserId: claim.parcel.verifiedOwnerUserId,
      },
      documents,
    }),
  );
}
