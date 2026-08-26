// ZAAHI Vault — GeoJSON feed for the "shared with me" map layer.
//
// GET /api/vault/shared-with-me/map → { type: "FeatureCollection", features }
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.1, §7.
//
// PII-redacted server-side: brokerNotes / nextFollowUpAt / ownerContact.notes
// are NOT selected — only public-facing facts (plot number, district, stage,
// price, geometry/coordinates). Same Polygon-synthesis pattern as the owner
// feed: every renderable entry comes back as a Polygon (real or 5 m
// placeholder). Entries with neither geometry nor lat/lng are skipped.

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

  const now = new Date();
  const shares = await prisma.vaultShare.findMany({
    where: {
      recipientUserId: userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      id: true,
      permission: true,
      vaultEntry: {
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
          ddaSnapshot: true,
          owner: { select: { id: true, nickname: true } },
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
                  maxHeightCode: true,
                  far: true,
                  plotAreaSqft: true,
                  maxGfaSqft: true,
                  projectName: true,
                  sitePlanIssue: true,
                  buildingLimitGeometry: true,
                  setbacks: true,
                  landUseMix: true,
                  buildingStyle: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const features: GeoJSON.Feature[] = [];
  for (const s of shares) {
    const e = s.vaultEntry;

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
      continue;
    }

    const plan = e.publicParcel?.affectionPlans?.[0] ?? null;
    let affectionPlan: AffectionPlanLike | null = null;
    if (plan) {
      affectionPlan = {
        maxFloors: plan.maxFloors,
        maxHeightMeters: plan.maxHeightMeters,
        // Extra fields surfaced for vault hover parity. AffectionPlanLike
        // is a structural superset — extra keys pass through unchanged.
        maxHeightCode: plan.maxHeightCode,
        far: plan.far,
        plotAreaSqft: plan.plotAreaSqft,
        maxGfaSqft: plan.maxGfaSqft,
        projectName: plan.projectName,
        sitePlanIssue: plan.sitePlanIssue?.toISOString() ?? null,
        buildingLimitGeometry: plan.buildingLimitGeometry,
        setbacks: plan.setbacks,
        landUseMix: plan.landUseMix,
        buildingStyle: plan.buildingStyle,
      } as AffectionPlanLike;
    }

    if (!affectionPlan && e.ddaSnapshot && typeof e.ddaSnapshot === "object") {
      try {
        affectionPlan = synthesizeAffectionPlanFromDdaSnapshot(e.ddaSnapshot as unknown as DdaSnapshot);
      } catch (err) {
        console.error("[vault shared map] DDA snapshot synth failed for entry", e.id, err);
      }
    }

    features.push({
      type: "Feature",
      geometry: polygon,
      properties: {
        id: e.id,
        shareId: s.id,
        plotNumber: e.plotNumber,
        emirate: e.emirate,
        district: e.district,
        stage: e.stage,
        askingPriceFils: e.askingPriceFils?.toString() ?? null,
        area: e.area,
        landUse: e.landUse,
        conflictsWithOthers: e.conflictsWithOthers,
        sharedBy: e.owner,
        permission: s.permission,
        source: "vault-shared" as const,
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
