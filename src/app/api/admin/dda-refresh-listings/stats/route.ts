// GET /api/admin/dda-refresh-listings/stats
//
// Stats panel for the admin Refresh DDA tool: counts fresh / stale /
// no-plan public ZAAHI listings so the admin can see batch size
// before kicking off a refresh. Same status set + 30-day staleness
// window as the POST handler.

import { NextRequest, NextResponse } from "next/server";
import { ParcelStatus } from "@prisma/client";
import { getAdminUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PUBLIC_STATUSES: ParcelStatus[] = [
  ParcelStatus.LISTED,
  ParcelStatus.VERIFIED,
  ParcelStatus.IN_DEAL,
];
const DEFAULT_STALE_DAYS = 30;

export async function GET(req: NextRequest) {
  const adminId = await getAdminUserId(req);
  if (!adminId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const since = new Date(Date.now() - DEFAULT_STALE_DAYS * 86_400_000);

  const plots = await prisma.parcel.findMany({
    where: { status: { in: PUBLIC_STATUSES } },
    select: {
      id: true,
      affectionPlans: {
        select: { fetchedAt: true },
        orderBy: { fetchedAt: "desc" },
        take: 1,
      },
    },
  });

  let stale = 0;
  let fresh = 0;
  let noPlan = 0;
  for (const p of plots) {
    const latest = p.affectionPlans[0]?.fetchedAt ?? null;
    if (!latest) noPlan++;
    else if (latest > since) fresh++;
    else stale++;
  }

  return NextResponse.json({
    totalPublic: plots.length,
    fresh,
    stale,
    noPlan,
    staleDaysCutoff: DEFAULT_STALE_DAYS,
    statuses: PUBLIC_STATUSES,
  });
}
