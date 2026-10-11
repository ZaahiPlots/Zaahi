import { NextResponse } from "next/server";

/**
 * Sold-plots data is founder research: ids, coordinates and sale history of
 * DXB Interact / DLD rows. Every /api/sold-plots/* handler resolves the caller
 * with getAdminUserId (founders + ADMIN) and passes the result here. Middleware
 * already answers 401 for a missing Bearer header; a verified-but-not-admin
 * caller (e.g. an approved FREE cohort user) gets 403. Kept free of imports
 * other than next/server so the e2e spec can exercise it without Supabase.
 */
export function soldPlotsDenied(adminUserId: string | null): NextResponse | null {
  if (adminUserId) return null;
  return NextResponse.json({ error: "forbidden" }, { status: 403, headers: PRIVATE });
}

/** Never cacheable by a shared cache — the payload is gated. */
export const PRIVATE = { "cache-control": "private, max-age=300" } as const;
