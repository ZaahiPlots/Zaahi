// GET /api/admin/registration/cap-counts
//
// Returns approved-application counts per cohort role (autoMigrated
// excluded per spec §5.3). Drives the cap-counter header on
// /admin/queue.
//
// Response: {
//   counts: Record<UserRole, number>,
//   capPerRole: 10
// }
//
// Includes only the 10 cohort applicant roles (ADMIN + INVESTOR
// excluded — never valid as cohort applicants per spec §5.1).

import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { CAP_PER_ROLE } from "@/lib/registration-cap";

export const runtime = "nodejs";

const COHORT_ROLES: UserRole[] = [
  "OWNER",
  "BROKER",
  "DEVELOPER",
  "BUYER",
  "ARCHITECT",
  "POA",
  "INTERMEDIARY",
  "RELATIVE",
  "REFERRAL",
  "OTHER",
];

export async function GET(req: NextRequest) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const grouped = await prisma.registrationApplication.groupBy({
    by: ["roleApplied"],
    where: {
      status: "APPROVED",
      autoMigrated: false,
      roleApplied: { in: COHORT_ROLES },
    },
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  for (const r of COHORT_ROLES) counts[r] = 0;
  for (const g of grouped) {
    if (g.roleApplied) counts[g.roleApplied] = g._count._all;
  }

  return NextResponse.json({ counts, capPerRole: CAP_PER_ROLE });
}
