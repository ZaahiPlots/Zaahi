// GET /api/me/plots
// Returns the current user's parcels with 30-day view stats — drives
// the OWNER dashboard "My Plots" section.
//
// Response shape:
//   items: Array<{
//     id, plotNumber, emirate, district, status, currentValuation (string),
//     area, createdAt,
//     stats: {
//       views30d: number,       // total views last 30 days (excluding owner)
//       viewsAllTime: number,
//       uniqueViewers30d: number,
//       lastViewedAt: ISO | null,
//     }
//   }>
//   count: number

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

function serialize<T>(v: T): T {
  return JSON.parse(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x)));
}

export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const plots = await prisma.parcel.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, plotNumber: true, emirate: true, district: true,
      status: true, currentValuation: true, area: true, createdAt: true,
    },
  });

  if (plots.length === 0) {
    return NextResponse.json({ items: [], count: 0 });
  }

  const plotIds = plots.map((p) => p.id);
  const cutoff30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  // Aggregate view stats in one query per metric.
  const [totalViews, views30d, lastViews, unique30dRaw] = await Promise.all([
    prisma.parcelView.groupBy({
      by: ["parcelId"],
      where: { parcelId: { in: plotIds } },
      _count: { _all: true },
    }),
    prisma.parcelView.groupBy({
      by: ["parcelId"],
      where: { parcelId: { in: plotIds }, viewedAt: { gt: cutoff30 } },
      _count: { _all: true },
    }),
    prisma.parcelView.groupBy({
      by: ["parcelId"],
      where: { parcelId: { in: plotIds } },
      _max: { viewedAt: true },
    }),
    prisma.parcelView.findMany({
      where: { parcelId: { in: plotIds }, viewedAt: { gt: cutoff30 } },
      select: { parcelId: true, userId: true },
      distinct: ["parcelId", "userId"],
    }),
  ]);

  const totalMap = new Map(totalViews.map((r) => [r.parcelId, r._count._all]));
  const recentMap = new Map(views30d.map((r) => [r.parcelId, r._count._all]));
  const lastMap = new Map(lastViews.map((r) => [r.parcelId, r._max.viewedAt]));
  const uniqueMap = new Map<string, number>();
  for (const row of unique30dRaw) {
    uniqueMap.set(row.parcelId, (uniqueMap.get(row.parcelId) ?? 0) + 1);
  }

  const items = plots.map((p) => ({
    ...p,
    stats: {
      viewsAllTime: totalMap.get(p.id) ?? 0,
      views30d: recentMap.get(p.id) ?? 0,
      uniqueViewers30d: uniqueMap.get(p.id) ?? 0,
      lastViewedAt: lastMap.get(p.id) ?? null,
    },
  }));

  return NextResponse.json(serialize({ items, count: items.length }));
}
