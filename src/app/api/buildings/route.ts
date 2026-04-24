import { NextRequest, NextResponse } from "next/server";
import { BuildingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

// Digital-twin buildings list — contextual 3D towers on /parcels/map.
// Mirrors the auth posture of /api/parcels/map: Bearer token required
// (browser goes through apiFetch which attaches the Supabase JWT) and
// handler rejects unapproved users. Read-only, no PII.
//
// Query params:
//   ?status=COMPLETED | UNDER_CONSTRUCTION | PLANNED   (optional filter)
//
// Default: returns only workflowStatus="live" rows so draft / archived
// buildings never leak onto the public map.
export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const statusParam = req.nextUrl.searchParams.get("status");
  const status =
    statusParam && Object.values(BuildingStatus).includes(statusParam as BuildingStatus)
      ? (statusParam as BuildingStatus)
      : undefined;

  const rows = await prisma.building.findMany({
    where: {
      workflowStatus: "live",
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  const items = rows.map((b) => ({
    id: b.id,
    name: b.name,
    status: b.status,
    community: b.community,
    masterPlan: b.masterPlan,
    plotNumber: b.plotNumber,
    emirate: b.emirate,
    centroidLat: b.centroidLat,
    centroidLng: b.centroidLng,
    footprintPolygon: b.footprintPolygon,
    developer: b.developer,
    architect: b.architect,
    completionYear: b.completionYear,
    expectedCompletion: b.expectedCompletion,
    constructionStarted: b.constructionStarted,
    floors: b.floors,
    heightM: b.heightM,
    totalUnits: b.totalUnits,
    buildingType: b.buildingType,
    description: b.description,
    amenities: b.amenities,
    photos: b.photos,
    modelPath: b.modelPath,
    rotationDeg: b.rotationDeg,
    scaleFactor: b.scaleFactor,
    modelProvider: b.modelProvider,
    propsearchUrl: b.propsearchUrl,
    sources: b.sources,
    confidenceLevel: b.confidenceLevel,
  }));

  return NextResponse.json({ items });
}
