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

// Centroid of a Polygon's outer ring — average of vertices, skipping the
// closing duplicate. Used by Archie's open_plot tool to fly the camera
// to the plot after opening its side panel.
function polygonCentroid(
  geom: unknown,
): { lat: number; lng: number } | null {
  if (!geom || typeof geom !== "object") return null;
  const g = geom as { type?: string; coordinates?: unknown };
  if (g.type !== "Polygon" || !Array.isArray(g.coordinates)) return null;
  const ring = g.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 3) return null;
  let lngSum = 0;
  let latSum = 0;
  let n = 0;
  const last = ring.length - 1;
  for (let i = 0; i < ring.length; i++) {
    const pt = ring[i];
    if (i === last && Array.isArray(pt) && Array.isArray(ring[0])
      && pt[0] === ring[0][0] && pt[1] === ring[0][1]) continue;
    if (!Array.isArray(pt) || typeof pt[0] !== "number" || typeof pt[1] !== "number") continue;
    lngSum += pt[0];
    latSum += pt[1];
    n++;
  }
  if (n === 0) return null;
  return { lng: lngSum / n, lat: latSum / n };
}

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
      geometry: true,
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

  const [claimsCount, callerClaim, callerVaultEntry] = await Promise.all([
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
    // Phase 3 vault unification: an open_plot tool call needs to route
    // to VaultSidePanelAdapter when the parcel is the caller's own
    // VAULT_PRIVATE entry — mirrors the click-handler branch in
    // src/app/parcels/map/page.tsx (isVault + vaultEntryId).
    prisma.vaultEntry.findFirst({
      where: { ownerId: userId, publicParcelId: parcel.id },
      select: { id: true },
    }),
  ]);

  const centroid = polygonCentroid(parcel.geometry);

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
      // Optional fields consumed by Archie's open_plot tool. AddPlotModal's
      // ProbeResponse type leaves these unread.
      latitude: centroid?.lat ?? null,
      longitude: centroid?.lng ?? null,
      isVault: callerVaultEntry != null,
      vaultEntryId: callerVaultEntry?.id ?? null,
    },
    callerHasClaim: callerClaim != null,
    callerClaim: callerClaim
      ? { id: callerClaim.id, role: callerClaim.roleAtClaim, status: callerClaim.status }
      : null,
  });
}
