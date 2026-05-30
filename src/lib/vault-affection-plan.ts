// Vault affection-plan helpers — Phase 3.5 (2026-05-30).
//
// Used by /api/me/vault/entries POST (ensureVaultPrivateParcel) and by
// scripts/backfill-vault-affection-plans.ts. Pulled out of the route
// module so the backfill script can share the exact same write logic
// without bundling a Next.js route file.
//
// Append-only per CLAUDE.md: AffectionPlan rows are history records;
// never mutate, never deleteMany. The latest row by `fetchedAt` is the
// effective one (the /api/parcels/map join takes top 1 desc).

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchFullDdaData } from "@/lib/dda-plot-lookup";
import type { AffectionPlan } from "@/lib/dda";

/** Append one AffectionPlan history row using the supplied plan +
 *  building-limit. No improvement check — caller decides whether to
 *  invoke. Throws on Prisma error. */
export async function writeAffectionPlan(
  parcelId: string,
  fallbackPlotNumber: string,
  plan: AffectionPlan,
  buildingLimit: GeoJSON.Polygon | null,
): Promise<void> {
  await prisma.affectionPlan.create({
    data: {
      parcelId,
      source: "dda:full-fetch",
      plotNumber: plan.plotNumber || fallbackPlotNumber,
      oldNumber: plan.oldNumber,
      projectName: plan.projectName,
      community: plan.community,
      masterDeveloper: plan.masterDeveloper,
      plotAreaSqm: plan.plotAreaSqm,
      plotAreaSqft: plan.plotAreaSqft,
      maxGfaSqm: plan.maxGfaSqm,
      maxGfaSqft: plan.maxGfaSqft,
      maxHeightCode: plan.maxHeightCode,
      maxFloors: plan.maxFloors,
      maxHeightMeters: plan.maxHeightMeters,
      far: plan.far,
      setbacks: (plan.setbacks ?? []) as unknown as Prisma.InputJsonValue,
      landUseMix: (plan.landUseMix ?? []) as unknown as Prisma.InputJsonValue,
      sitePlanIssue: plan.sitePlanIssue ? new Date(plan.sitePlanIssue) : null,
      sitePlanExpiry: plan.sitePlanExpiry ? new Date(plan.sitePlanExpiry) : null,
      notes: plan.notes,
      buildingLimitGeometry:
        (buildingLimit as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });
}

/** Improvement check + append. Idempotent — if the latest AffectionPlan
 *  on `parcelId` already has the fields the renderer needs (building
 *  limit, maxFloors, maxHeightMeters, far), this is a no-op.
 *
 *  When the caller does not provide `clientPlan`, the helper falls
 *  back to fetchFullDdaData(plotNumber) so the backfill script can
 *  use it without pre-fetching itself.
 *
 *  Best-effort: errors are logged and swallowed so the calling loop
 *  (vault add, backfill) continues. The return value tells the caller
 *  whether a row was appended. */
export async function maybeAppendAffectionPlan(
  parcelId: string,
  args: {
    plotNumber: string;
    clientPlan: AffectionPlan | null;
    clientBuildingLimit: GeoJSON.Polygon | null;
  },
): Promise<{ appended: boolean; reason: string }> {
  try {
    let plan = args.clientPlan;
    let buildingLimit = args.clientBuildingLimit;
    if (!plan) {
      const live = await fetchFullDdaData(args.plotNumber);
      if (live) {
        plan = live.plan;
        buildingLimit = buildingLimit ?? live.buildingLimit;
      }
    }
    if (!plan) return { appended: false, reason: "no-plan-data" };

    const latest = await prisma.affectionPlan.findFirst({
      where: { parcelId },
      orderBy: { fetchedAt: "desc" },
      select: {
        maxFloors: true,
        maxHeightMeters: true,
        far: true,
        buildingLimitGeometry: true,
      },
    });

    const incomingHasBuildingLimit = buildingLimit != null;
    const incomingHasMaxFloors = plan.maxFloors != null;
    const incomingHasFar = plan.far != null;
    const incomingHasHeight = plan.maxHeightMeters != null;

    const latestHasBuildingLimit = latest?.buildingLimitGeometry != null;
    const latestHasMaxFloors = latest?.maxFloors != null;
    const latestHasFar = latest?.far != null;
    const latestHasHeight = latest?.maxHeightMeters != null;

    const wouldImprove =
      latest == null ||
      (!latestHasBuildingLimit && incomingHasBuildingLimit) ||
      (!latestHasMaxFloors && incomingHasMaxFloors) ||
      (!latestHasFar && incomingHasFar) ||
      (!latestHasHeight && incomingHasHeight);

    if (!wouldImprove) {
      return { appended: false, reason: "latest-already-complete" };
    }

    await writeAffectionPlan(parcelId, args.plotNumber, plan, buildingLimit);
    return { appended: true, reason: "improved" };
  } catch (e) {
    console.error("[maybeAppendAffectionPlan] failed for parcel", parcelId, e);
    return { appended: false, reason: "error" };
  }
}
