// ZAAHI Vault — GeoJSON feed for the caller's own vault map layer.
//
// GET /api/me/vault/map → { features: GeoJSON.Feature[] }
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.1, §7.
//
// One feature per VaultEntry that has usable geometry (Polygon) OR a
// fallback Point from (lat, lng). Entries with neither are skipped —
// they appear in list view only.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const entries = await prisma.vaultEntry.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      plotNumber: true,
      emirate: true,
      district: true,
      stage: true,
      askingPriceFils: true,
      area: true,
      latitude: true,
      longitude: true,
      geometry: true,
      landUse: true,
      conflictsWithOthers: true,
      addedByUserId: true,
    },
  });

  const features: GeoJSON.Feature[] = [];
  for (const e of entries) {
    const props = {
      id: e.id,
      plotNumber: e.plotNumber,
      emirate: e.emirate,
      district: e.district,
      stage: e.stage,
      askingPriceFils: e.askingPriceFils?.toString() ?? null,
      area: e.area,
      landUse: e.landUse,
      conflictsWithOthers: e.conflictsWithOthers,
      source: "vault-mine" as const,
      addedByMe: e.addedByUserId === userId,
    };
    if (e.geometry && typeof e.geometry === "object") {
      features.push({
        type: "Feature",
        geometry: e.geometry as unknown as GeoJSON.Geometry,
        properties: props,
      });
    } else if (e.latitude !== null && e.longitude !== null) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [e.longitude, e.latitude] },
        properties: { ...props, placeholder: true },
      });
    }
    // entries with neither geometry nor (lat, lng) are skipped — list-only
  }

  return NextResponse.json({
    type: "FeatureCollection" as const,
    features,
  });
}
