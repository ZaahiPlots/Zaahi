// GET /api/me/favorites — list saved parcels for the current user.
// Returns parcels with enough detail to render a shortlist grid: plot
// number, district, emirate, area, currentValuation, geometry centroid.

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

  const rows = await prisma.savedParcel.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, createdAt: true,
      parcel: {
        select: {
          id: true, plotNumber: true, emirate: true, district: true,
          area: true, currentValuation: true, status: true,
          latitude: true, longitude: true,
        },
      },
    },
  });

  return NextResponse.json(serialize({ items: rows, count: rows.length }));
}
