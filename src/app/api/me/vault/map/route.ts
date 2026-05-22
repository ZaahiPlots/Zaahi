// ZAAHI Vault — GeoJSON feed for the caller's own vault map layer.
//
// GET /api/me/vault/map → { features: GeoJSON.Feature[] }
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.1, §7.
//
// One Polygon feature per VaultEntry. Sources:
//   • `geometry` field on the entry (DDA-resolved or future affection-plan parse)
//   • `publicParcel.geometry` (DDA-resolved entries that didn't copy)
//   • synthesised 5 m square around (lat, lng) when neither geometry nor
//     publicParcel exists — placeholder so the entry is visible on the map.
//   • entries with neither geometry nor (lat, lng) and no publicParcel link
//     are skipped (list-view only).
//
// When the entry is linked to a public Parcel (DDA path), we also return the
// latest AffectionPlan fields so the client can render the ZAAHI Signature
// (podium/body/crown) instead of a flat block.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { synthesizePlaceholderPolygon } from "@/lib/vault-geometry";
import {
  synthesizeAffectionPlanFromDdaSnapshot,
  type DdaSnapshot,
  type AffectionPlanLike,
} from "@/lib/dda-plot-lookup";

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
      ddaSnapshot: true,
      publicParcel: {
        select: {
          id: true,
          geometry: true,
          affectionPlans: {
            orderBy: { fetchedAt: "desc" },
            take: 1,
            select: {
              maxFloors: true,
              maxHeightMeters: true,
              buildingLimitGeometry: true,
              setbacks: true,
              landUseMix: true,
              buildingStyle: true,
            },
          },
        },
      },
    },
  });

  const features: GeoJSON.Feature[] = [];
  for (const e of entries) {
    let polygon: GeoJSON.Polygon | null = null;
    let placeholder = false;

    if (
      e.geometry &&
      typeof e.geometry === "object" &&
      (e.geometry as { type?: string }).type === "Polygon"
    ) {
      polygon = e.geometry as unknown as GeoJSON.Polygon;
    } else if (
      e.publicParcel?.geometry &&
      typeof e.publicParcel.geometry === "object" &&
      (e.publicParcel.geometry as { type?: string }).type === "Polygon"
    ) {
      polygon = e.publicParcel.geometry as unknown as GeoJSON.Polygon;
    } else if (e.latitude !== null && e.longitude !== null) {
      polygon = synthesizePlaceholderPolygon(e.latitude, e.longitude, 5);
      placeholder = true;
    } else {
      continue; // list-only
    }

    const plan = e.publicParcel?.affectionPlans?.[0] ?? null;
    let affectionPlan: AffectionPlanLike | null = null;
    if (plan) {
      affectionPlan = {
        maxFloors: plan.maxFloors,
        maxHeightMeters: plan.maxHeightMeters,
        buildingLimitGeometry: plan.buildingLimitGeometry,
        setbacks: plan.setbacks,
        landUseMix: plan.landUseMix,
        buildingStyle: plan.buildingStyle,
      };
    }

    // Live-DDA entries (Path 1 fallback) — synthesise the affectionPlan shape
    // from the stored DDA snapshot so the client renders Signature tiers
    // without needing a Parcel + AffectionPlan join.
    if (!affectionPlan && e.ddaSnapshot && typeof e.ddaSnapshot === "object") {
      try {
        affectionPlan = synthesizeAffectionPlanFromDdaSnapshot(e.ddaSnapshot as unknown as DdaSnapshot);
      } catch (err) {
        console.warn("[vault map] DDA snapshot synth failed for entry", e.id, err);
      }
    }

    features.push({
      type: "Feature",
      geometry: polygon,
      properties: {
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
        placeholder,
        affectionPlan,
      },
    });
  }

  return NextResponse.json({
    type: "FeatureCollection" as const,
    features,
  });
}
