// ── Admin: list ambassador applications + aggregated stats ──────────
// GET /api/admin/ambassador-applications
//   ?status=PENDING|APPROVED|REJECTED|ALL   (default ALL)
//   ?search=<name|email|txHash substring>   (optional)
//   ?limit=<1..500>                         (default 100)
//
// Response:
//   {
//     applications: AmbassadorApplication[],   // ordered newest first
//     total: number,                           // applications in filter
//     stats: { pending, approved, rejected, active, totalRevenueAed }
//   }
//
// Auth: getAdminUserId() — founder email or User.role === ADMIN.

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { PLAN_PRICES_AED, type AmbassadorPlan } from "@/lib/ambassador";

export const runtime = "nodejs";

const LIMIT_MAX = 500;
const LIMIT_DEFAULT = 100;

export async function GET(req: NextRequest) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const statusFilter = (url.searchParams.get("status") || "ALL").toUpperCase();
  const search = url.searchParams.get("search")?.trim() || "";
  const limitRaw = Number(url.searchParams.get("limit") || LIMIT_DEFAULT);
  const limit = Math.max(1, Math.min(LIMIT_MAX, Number.isFinite(limitRaw) ? limitRaw : LIMIT_DEFAULT));

  const where: Prisma.AmbassadorApplicationWhereInput = {};
  if (statusFilter !== "ALL") {
    where.status = statusFilter;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { txHash: { contains: search, mode: "insensitive" } },
    ];
  }

  const [applications, statusCounts, approvedForRevenue] = await Promise.all([
    prisma.ambassadorApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.ambassadorApplication.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.ambassadorApplication.findMany({
      where: { status: { in: ["APPROVED", "ACTIVE"] } },
      select: { plan: true },
    }),
  ]);

  const stats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    active: 0,
    totalRevenueAed: 0,
  };
  for (const row of statusCounts) {
    const key = (row.status || "").toLowerCase();
    if (key === "pending") stats.pending = row._count.status;
    else if (key === "approved") stats.approved = row._count.status;
    else if (key === "rejected") stats.rejected = row._count.status;
    else if (key === "active") stats.active = row._count.status;
  }
  for (const row of approvedForRevenue) {
    const price = PLAN_PRICES_AED[row.plan as AmbassadorPlan];
    if (typeof price === "number") stats.totalRevenueAed += price;
  }

  return NextResponse.json({
    applications,
    total: applications.length,
    stats,
  });
}
