// GET /api/me/access-status — the pause screen's own probe.
//
// The ONLY protected route a PAUSED user is allowed to reach (besides
// client-side sign-out). It uses getAccessState(), not getApprovedUserId():
// the latter returns null for paused users by design (the single shared
// gate in src/lib/auth.ts), so it can never tell the client *why* access
// is closed. This route can. Middleware still requires a Bearer token and
// the token is verified against Supabase + approved=true, so nothing about
// an account is disclosed to anyone but its owner.
//
// Response:
//   200 { status: "ACTIVE" }
//   200 { status: "PAUSED", code: "SUBSCRIPTION_PAUSED", pausedAt }
//   401 { error: "unauthorized" }   (no / invalid / unapproved token)

import { NextRequest, NextResponse } from "next/server";
import { getAccessState } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const state = await getAccessState(req);
  if (!state) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const headers = { "cache-control": "private, no-store" };
  if (state.status === "PAUSED") {
    return NextResponse.json(
      {
        status: "PAUSED",
        code: "SUBSCRIPTION_PAUSED",
        pausedAt: state.pausedAt ? state.pausedAt.toISOString() : null,
      },
      { headers },
    );
  }
  return NextResponse.json({ status: "ACTIVE" }, { headers });
}
