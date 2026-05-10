// GET /api/admin/plot-claims — PlotClaimVerification queue (spec §7.5).
//
// Lists PENDING PlotClaims that DON'T go through the Title Deed tab —
// i.e. the non-OWNER verifiable roles: BROKER / DEVELOPER / ARCHITECT
// / POA. The Title Deed queue handles OWNER PENDING claims.
// SELF_DECLARED roles never appear here.
//
// Query params:
//   role  — optional UserRole filter (one of BROKER/DEVELOPER/ARCHITECT/POA)
//   q     — substring search (plotNumber / district / nickname)
//   limit — 1..100 (default 50)
//
// Auth: getAdminUserId.

import { NextRequest, NextResponse } from "next/server";
import { ClaimStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { serialize } from "@/lib/serialize";

export const runtime = "nodejs";

const NON_OWNER_VERIFIABLE: UserRole[] = [
  UserRole.BROKER,
  UserRole.DEVELOPER,
  UserRole.ARCHITECT,
  UserRole.POA,
];

export async function GET(req: NextRequest) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = req.nextUrl;
  const roleParam = url.searchParams.get("role");
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

  // Validate role filter — must be one of the non-OWNER verifiable roles.
  let roleFilter: UserRole[] = NON_OWNER_VERIFIABLE;
  if (roleParam) {
    const parts = roleParam.split(",").map((s) => s.trim());
    const valid = parts.filter((p): p is UserRole =>
      (NON_OWNER_VERIFIABLE as string[]).includes(p),
    );
    if (valid.length > 0) roleFilter = valid;
  }

  const claims = await prisma.plotClaim.findMany({
    where: {
      status: ClaimStatus.PENDING,
      roleAtClaim: { in: roleFilter },
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
      roleAtClaim: true,
      priceAed: true,
      createdAt: true,
      user: { select: { id: true, nickname: true } },
      parcel: {
        select: {
          id: true,
          plotNumber: true,
          district: true,
          emirate: true,
          verifiedOwnerUserId: true,
        },
      },
    },
  });

  const totalCount = await prisma.plotClaim.count({
    where: { status: ClaimStatus.PENDING, roleAtClaim: { in: NON_OWNER_VERIFIABLE } },
  });

  return NextResponse.json(serialize({ items: claims, total: totalCount }));
}
