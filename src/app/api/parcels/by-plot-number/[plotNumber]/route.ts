// GET /api/parcels/by-plot-number/[plotNumber]
//
// Lightweight existence probe used by AddPlotModal to disambiguate
// Path A (DDA scrape, plot is new) vs Path C (multi-claim, plot already
// has a Parcel row). Spec-05 §8.4 + audit Q3 — runs sub-100ms, single
// indexed lookup against the Parcel table; never calls DDA.
//
// The probe also reports whether the *current* user already has a claim
// on this parcel. Path C UI uses that to hide the "Add your claim" form
// when the caller is already on the claim list (one user = one claim
// per plot, per spec §8.4 step 3 / new DB unique).
//
// Auth: getApprovedUserId — same gate as the rest of the parcel APIs.
//
// Plot-number lookup is by plotNumber alone (matching the
// "no duplicates" rule in CLAUDE.md "Правила добавления участков").
// If multiple emirates ever stored the same plotNumber the lookup
// returns the most recently created — consistent with the modal's
// expectation that a plot number resolves to a single Parcel.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ plotNumber: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { plotNumber: rawPlot } = await params;
  const plotNumber = rawPlot?.trim();
  if (!plotNumber || !/^\d{5,10}$/.test(plotNumber)) {
    return NextResponse.json({ error: "invalid_plot_number" }, { status: 400 });
  }

  const parcel = await prisma.parcel.findFirst({
    where: { plotNumber },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      plotNumber: true,
      emirate: true,
      district: true,
      verifiedOwnerUserId: true,
      affectionPlans: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
        select: { projectName: true, landUseMix: true },
      },
    },
  });

  if (!parcel) {
    return NextResponse.json({ exists: false });
  }

  const [claimsCount, callerClaim] = await Promise.all([
    prisma.plotClaim.count({
      where: {
        parcelId: parcel.id,
        // Spec §5.4.1 LOCK-8: the dormant ADMIN system claims (one per
        // backfilled parcel) are inventory bookkeeping, not public-facing
        // claims. Hide them from the public claim count so the UI
        // doesn't render a meaningless "1 existing claim" on every
        // legacy plot.
        roleAtClaim: { not: "ADMIN" },
      },
    }),
    prisma.plotClaim.findFirst({
      where: { parcelId: parcel.id, userId },
      select: { id: true, roleAtClaim: true, status: true },
    }),
  ]);

  return NextResponse.json({
    exists: true,
    parcel: {
      id: parcel.id,
      plotNumber: parcel.plotNumber,
      emirate: parcel.emirate,
      district: parcel.district,
      projectName: parcel.affectionPlans[0]?.projectName ?? parcel.district,
      hasVerifiedOwner: parcel.verifiedOwnerUserId != null,
      claimsCount,
    },
    callerHasClaim: callerClaim != null,
    callerClaim: callerClaim
      ? { id: callerClaim.id, role: callerClaim.roleAtClaim, status: callerClaim.status }
      : null,
  });
}
