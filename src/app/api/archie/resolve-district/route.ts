// Archie helper — resolve a district / community name to map bounds.
//
// Used by the `fly_to_district` tool. Phase 2 of the Archie OpenAI
// integration (2026-05-30).
//
// Strategy: data-driven, no maintained mapping. We query the Parcel
// table for rows whose `district` matches the user-supplied name
// (case-insensitive equality first, then contains). If we find any,
// we compute their bounding box and return the center + bounds for
// `mapControls.fitBounds`. If nothing matches, return 404 so the
// model can apologise to the user with the "couldn't find X" fallback
// text (founder spec 2026-05-30).
//
// Auth: getApprovedUserId — same posture as /api/archie itself.
// Read-only. No PII surface.

import { NextRequest, NextResponse } from "next/server";
import { ParcelStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { emirateMatchVariants } from "@/lib/emirate";

export const runtime = "nodejs";

type Bbox = { minLng: number; minLat: number; maxLng: number; maxLat: number };

function bboxFromGeometry(geom: unknown, b: Bbox) {
  if (!geom || typeof geom !== "object") return;
  const g = geom as { type?: string; coordinates?: unknown };
  if (g.type !== "Polygon" || !Array.isArray(g.coordinates)) return;
  for (const ring of g.coordinates as unknown[]) {
    if (!Array.isArray(ring)) continue;
    for (const p of ring as unknown[]) {
      if (!Array.isArray(p) || p.length < 2) continue;
      const lng = Number(p[0]);
      const lat = Number(p[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      if (lng < b.minLng) b.minLng = lng;
      if (lat < b.minLat) b.minLat = lat;
      if (lng > b.maxLng) b.maxLng = lng;
      if (lat > b.maxLat) b.maxLat = lat;
    }
  }
}

export async function GET(req: NextRequest) {
  const callerId = await getApprovedUserId(req);
  if (!callerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: "name_too_long" }, { status: 400 });

  // AD-1 hardcode fix (founder spec 2026-06-01, completes D11):
  // the two queries below used to pin `emirate: "Dubai"`, so Archie's
  // fly_to_district tool returned 404 for any AD district (Saadiyat,
  // Yas Island, Al Reem, …). Optional ?emirate= query param now scopes
  // the lookup when the caller knows the answer; absent emirate
  // searches across all emirates (the most useful default for an LLM
  // user who just types "Yas Island" without knowing the platform's
  // emirate enum).
  const emirateParam = req.nextUrl.searchParams.get("emirate")?.trim();
  const emirateFilter = emirateParam
    ? [{ emirate: { in: emirateMatchVariants(emirateParam) } }]
    : [];

  // Match the caller's own VAULT_PRIVATE rows too, in case Archie is
  // helping them navigate their personal portfolio. Public statuses
  // are visible to everyone.
  const baseStatusFilter = {
    OR: [
      { status: { in: [ParcelStatus.LISTED, ParcelStatus.VERIFIED, ParcelStatus.IN_DEAL] } },
      { status: ParcelStatus.VAULT_PRIVATE, ownerId: callerId },
    ],
  };

  // Try exact (case-insensitive) first; fall back to contains.
  let parcels = await prisma.parcel.findMany({
    where: {
      AND: [
        baseStatusFilter,
        ...emirateFilter,
        { district: { equals: name, mode: "insensitive" } },
      ],
    },
    select: { latitude: true, longitude: true, geometry: true, district: true },
    take: 300,
  });
  let matchMode: "exact" | "contains" = "exact";

  if (parcels.length === 0) {
    parcels = await prisma.parcel.findMany({
      where: {
        AND: [
          baseStatusFilter,
          ...emirateFilter,
          { district: { contains: name, mode: "insensitive" } },
        ],
      },
      select: { latitude: true, longitude: true, geometry: true, district: true },
      take: 300,
    });
    matchMode = "contains";
  }

  if (parcels.length === 0) {
    return NextResponse.json({ error: "not_found", name }, { status: 404 });
  }

  const bbox: Bbox = { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity };
  let pointCount = 0;
  let sumLng = 0;
  let sumLat = 0;
  for (const p of parcels) {
    if (p.geometry) bboxFromGeometry(p.geometry, bbox);
    if (p.latitude != null && p.longitude != null) {
      sumLng += p.longitude;
      sumLat += p.latitude;
      pointCount++;
    }
  }

  // Prefer bbox from geometry rings (more accurate). Fall back to
  // latitude/longitude centroid when no geometry was found.
  let center: [number, number];
  let bounds: [[number, number], [number, number]] | null = null;
  if (Number.isFinite(bbox.minLng)) {
    bounds = [
      [bbox.minLng, bbox.minLat],
      [bbox.maxLng, bbox.maxLat],
    ];
    center = [(bbox.minLng + bbox.maxLng) / 2, (bbox.minLat + bbox.maxLat) / 2];
  } else if (pointCount > 0) {
    center = [sumLng / pointCount, sumLat / pointCount];
  } else {
    return NextResponse.json({ error: "no_geometry" }, { status: 404 });
  }

  // Canonical district name from the first row — DDA's
  // PROJECT_NAME case wins over the user-typed casing.
  const canonical = parcels[0].district;

  return NextResponse.json({
    name: canonical,
    matchedCount: parcels.length,
    matchMode,
    center,
    bounds,
  });
}
