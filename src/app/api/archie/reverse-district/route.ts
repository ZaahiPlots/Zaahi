// Archie helper — reverse lookup of camera position → containing district.
//
// Used by the proactive-Archie trigger engine
// (src/lib/use-proactive-archie.ts). The client debounces camera-move
// events to 600 ms and only queries this endpoint at zoom ≥ 12.
//
// GET /api/archie/reverse-district?lng=<n>&lat=<n>
//   → { name, source, bounds, polygon, level }    on hit
//   → { error: "not_found" }                       when no boundary contains the point
//   → { error: "missing_coords" | "bad_coords" }   400 on bad input
//
// Cache headers: 60 s public (cameras typically dwell on one spot for
// seconds; identical (lng, lat) requests should hit the CDN).
//
// Auth: getApprovedUserId — same posture as the rest of /api/archie/*.

import { NextRequest, NextResponse } from "next/server";
import { getApprovedUserId } from "@/lib/auth";
import { findDistrictAtPoint, type DistrictSource } from "@/lib/district-boundaries";

export const runtime = "nodejs";

function levelFor(source: DistrictSource): "project" | "district" | "community" | "municipality" {
  switch (source) {
    case "dda-project": return "project";
    case "ad-district": return "district";
    case "dubai-community":
    case "ad-community": return "community";
    case "ad-municipality": return "municipality";
  }
}

export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const lngRaw = url.searchParams.get("lng");
  const latRaw = url.searchParams.get("lat");
  if (!lngRaw || !latRaw) {
    return NextResponse.json({ error: "missing_coords" }, { status: 400 });
  }
  const lng = Number(lngRaw);
  const lat = Number(latRaw);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return NextResponse.json({ error: "bad_coords" }, { status: 400 });
  }
  // Sanity bounds: UAE roughly lng 51..57, lat 22..27. Clamp the
  // search to a generous superset of UAE; anywhere else is a wasted
  // round-trip from a runaway camera.
  if (lng < 50 || lng > 58 || lat < 21 || lat > 28) {
    return NextResponse.json({ error: "out_of_range" }, { status: 404 });
  }

  const hit = findDistrictAtPoint(lng, lat);
  if (!hit) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(
    {
      name: hit.name,
      source: hit.source,
      level: levelFor(hit.source),
      bounds: hit.bounds,
      polygon: hit.polygon,
    },
    {
      headers: { "cache-control": "public, max-age=60" },
    },
  );
}
