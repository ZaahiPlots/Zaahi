import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

// Single building detail — used by the SidePanel card on /parcels/map.
// Returns the full row (minus internal workflow fields) for a live
// building only. Non-live rows 404 so drafts never leak.
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const b = await prisma.building.findFirst({
    where: { id, workflowStatus: "live" },
  });
  if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
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
  });
}
