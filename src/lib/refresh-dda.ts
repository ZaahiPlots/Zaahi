// Safe DDA refresh helper for a single parcel.
//
// Used by scripts/refresh-all-dda.ts (admin bulk refresh) and reusable
// by any future per-plot admin "Refresh DDA" surface. Intentionally
// narrower than /api/parcels/seed-dda — the seed-dda route mutates
// currentValuation, status, owner-side PlotClaim, and uses
// affectionPlan.deleteMany. None of those side effects are safe to
// fan out across the public listings table at admin discretion.
//
// What this DOES:
//   - Refresh geometry + latitude + longitude from BASIC_LAND_BASE
//   - Append a new AffectionPlan history row (writeAffectionPlan)
//
// What this NEVER touches:
//   - currentValuation         (price is owner-set, see CLAUDE.md)
//   - status                   (LISTED stays LISTED)
//   - ownerId / verifiedOwnerUserId  (LOCK-8 / CORR-1 immutables)
//   - PlotClaim rows           (admin doesn't claim what they refresh)
//   - existing AffectionPlan rows    (append-only per CLAUDE.md)
//
// Failure model: never throws. Returns a structured RefreshDdaResult so
// the bulk loop can log+continue past one bad plot.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchFullDdaData } from "@/lib/dda-plot-lookup";
import { writeAffectionPlan } from "@/lib/vault-affection-plan";

export interface RefreshDdaResult {
  ok: boolean;
  parcelId: string;
  plotNumber: string;
  reason: string;
  durationMs: number;
  geometryUpdated: boolean;
  planAppended: boolean;
}

export async function refreshDdaForParcel(
  parcelId: string,
  plotNumber: string,
): Promise<RefreshDdaResult> {
  const t0 = Date.now();
  const base = {
    parcelId,
    plotNumber,
    geometryUpdated: false,
    planAppended: false,
  };

  try {
    const live = await fetchFullDdaData(plotNumber);
    if (!live) {
      return {
        ...base,
        ok: false,
        reason: "dda-miss",
        durationMs: Date.now() - t0,
      };
    }

    // Refresh the polygon + centroid only. Founder spec is explicit:
    // ONLY geometry / latitude / longitude on Parcel. Area is left
    // alone because the seed pipelines are the canonical writer for
    // that field (and DDA's AREA_SQFT can drift in ways the founder
    // hasn't approved for blanket updates).
    await prisma.parcel.update({
      where: { id: parcelId },
      data: {
        geometry: live.basic.geometry as unknown as Prisma.InputJsonValue,
        latitude: live.basic.latitude,
        longitude: live.basic.longitude,
      },
    });

    // Append a fresh AffectionPlan row — append-only per CLAUDE.md.
    // The append is unconditional (not improvement-gated) because the
    // explicit purpose of bulk-refresh is to reset fetchedAt on every
    // public plot so the next staleness sweep can skip them.
    if (live.plan) {
      await writeAffectionPlan(
        parcelId,
        plotNumber,
        live.plan,
        live.buildingLimit,
      );
      return {
        ...base,
        ok: true,
        reason: "refreshed",
        geometryUpdated: true,
        planAppended: true,
        durationMs: Date.now() - t0,
      };
    }

    // Polygon refreshed but DDA returned no parseable plan — still
    // a partial success (geometry is the safer half).
    return {
      ...base,
      ok: true,
      reason: "geometry-only",
      geometryUpdated: true,
      planAppended: false,
      durationMs: Date.now() - t0,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 160) : String(e);
    return {
      ...base,
      ok: false,
      reason: `error: ${msg}`,
      durationMs: Date.now() - t0,
    };
  }
}
