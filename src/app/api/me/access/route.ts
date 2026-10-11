// GET /api/me/access — client probe for founder-only surfaces (the Layers row
// "Sold plots" renders only when isAdmin). Same membership as getAdminUserId:
// founders + ADMIN. A valid non-admin session gets 200 { isAdmin: false } so the
// client can hide the row quietly; no/invalid Bearer is 401 (middleware).

import { NextRequest, NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const isAdmin = (await getAdminUserId(req)) !== null;
  return NextResponse.json({ isAdmin }, { headers: { "cache-control": "private, no-store" } });
}
