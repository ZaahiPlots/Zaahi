// ── Admin self-check ping ────────────────────────────────────────────
// GET /api/admin/me
// Returns { isAdmin: true, userId } if getAdminUserId() passes, 401 otherwise.
// Used by the map HeaderBar to conditionally render the admin nav link.

import { NextRequest, NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ isAdmin: false }, { status: 401 });
  return NextResponse.json({ isAdmin: true, userId: adminId });
}
