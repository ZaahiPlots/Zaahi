// GET /api/admin/title-deeds — TitleDeedVerification queue (spec §7.5).
//
// Lists Parcels that need an OWNER verification: where
// `verifiedOwnerUserId IS NULL` AND there is at least one
// `PlotClaim WHERE roleAtClaim='OWNER' AND status='PENDING'`.
//
// Response shape mirrors /api/admin/registration: items + total +
// nextCursor for future pagination. Each item carries enough plot +
// claimant context for the list UI without a second fetch:
//   {
//     parcelId, plotNumber, district, projectName, ownerCreatorNickname,
//     pendingOwnerClaim: { claimId, userId, nickname, createdAt, priceAed }
//   }
//
// Auth: getAdminUserId.

import { NextRequest, NextResponse } from "next/server";
import { ClaimStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { serialize } from "@/lib/serialize";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = req.nextUrl;
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

  // Pull all PENDING OWNER claims; group up by parcel. We rely on the
  // (parcelId, roleAtClaim, status) composite index added in Step 4 (CORR-5).
  // `q` does substring search on plot number / nickname / district.
  const claims = await prisma.plotClaim.findMany({
    where: {
      roleAtClaim: UserRole.OWNER,
      status: ClaimStatus.PENDING,
      parcel: { verifiedOwnerUserId: null },
      ...(q
        ? {
            OR: [
              { parcel: { plotNumber: { contains: q, mode: "insensitive" } } },
              { parcel: { district: { contains: q, mode: "insensitive" } } },
              { user: { nickname: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      userId: true,
      priceAed: true,
      createdAt: true,
      user: {
        select: { id: true, nickname: true, email: true, role: true },
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
            select: { projectName: true },
          },
          owner: {
            select: { id: true, nickname: true },
          },
        },
      },
    },
  });

  // Some parcels may have multiple OWNER PENDING claims (two users each
  // claim ownership). Group by parcelId — keep all claims so the admin
  // can pick which one to verify; the detail endpoint loads them all.
  const byParcel = new Map<
    string,
    {
      parcelId: string;
      plotNumber: string;
      district: string;
      emirate: string;
      projectName: string;
      creatorNickname: string | null;
      claims: Array<{
        claimId: string;
        userId: string;
        nickname: string | null;
        priceAed: bigint;
        createdAt: Date;
      }>;
    }
  >();
  for (const c of claims) {
    const p = c.parcel;
    const entry =
      byParcel.get(p.id) ??
      {
        parcelId: p.id,
        plotNumber: p.plotNumber,
        district: p.district,
        emirate: p.emirate,
        projectName: p.affectionPlans[0]?.projectName ?? p.district,
        creatorNickname: p.owner?.nickname ?? null,
        claims: [],
      };
    entry.claims.push({
      claimId: c.id,
      userId: c.userId,
      nickname: c.user.nickname ?? null,
      priceAed: c.priceAed,
      createdAt: c.createdAt,
    });
    byParcel.set(p.id, entry);
  }

  const items = Array.from(byParcel.values());
  const totalParcels = await prisma.parcel.count({
    where: {
      verifiedOwnerUserId: null,
      claims: { some: { roleAtClaim: UserRole.OWNER, status: ClaimStatus.PENDING } },
    },
  });

  return NextResponse.json(serialize({ items, total: totalParcels }));
}
