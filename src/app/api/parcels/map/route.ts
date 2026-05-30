import { NextRequest, NextResponse } from 'next/server';
import { ParcelStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';

/**
 * Compact payload for the main map: parcel + latest affection plan only.
 *
 * Phase 3 of vault refactor (founder spec 2026-05-30): single source of
 * truth for the map. Public listings + caller's VAULT_PRIVATE entries
 * flow through the same fill-extrusion layer (ZAAHI_BUILDINGS_3D,
 * opacity 1, land-use colour). The branch lives in `properties.isVault`
 * so the client click handler can route to VaultSidePanelAdapter for
 * vault rows.
 *
 * Shares from other users are out of scope here — VAULT_SHARED_3D still
 * carries those.
 */
export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Caller's own vault entries (owner side) keyed by publicParcelId.
  // Used to (a) extend the parcel filter to include the caller's
  // VAULT_PRIVATE rows, and (b) override price + flag isVault on the
  // returned items.
  const myVaultEntries = await prisma.vaultEntry.findMany({
    where: { ownerId: userId, publicParcelId: { not: null } },
    select: {
      id: true,
      publicParcelId: true,
      askingPriceFils: true,
      conflictsWithOthers: true,
    },
  });
  const vaultByParcelId = new Map<string, { entryId: string; priceFils: bigint | null; conflicts: boolean }>();
  for (const e of myVaultEntries) {
    if (e.publicParcelId) {
      vaultByParcelId.set(e.publicParcelId, {
        entryId: e.id,
        priceFils: e.askingPriceFils,
        conflicts: e.conflictsWithOthers,
      });
    }
  }

  const parcels = await prisma.parcel.findMany({
    where: {
      geometry: { not: undefined },
      OR: [
        // Public listings (unchanged).
        { status: { in: [ParcelStatus.LISTED, ParcelStatus.VERIFIED, ParcelStatus.IN_DEAL] } },
        // Caller's own VAULT_PRIVATE rows — surfaced via vault-entry join.
        {
          status: ParcelStatus.VAULT_PRIVATE,
          id: { in: Array.from(vaultByParcelId.keys()) },
        },
      ],
    },
    include: {
      affectionPlans: {
        orderBy: { fetchedAt: 'desc' },
        take: 1,
        select: {
          maxFloors: true,
          maxHeightMeters: true,
          maxHeightCode: true,
          projectName: true,
          community: true,
          buildingLimitGeometry: true,
          plotAreaSqm: true,
          plotAreaSqft: true,
          maxGfaSqm: true,
          maxGfaSqft: true,
          far: true,
          landUseMix: true,
          setbacks: true,
          buildingStyle: true,
          // Date the plan was issued by DDA (preferred) + fetchedAt as
          // a fallback for the hover-card "Affection Plan" row.
          sitePlanIssue: true,
          fetchedAt: true,
        },
      },
    },
  });

  const items = parcels.map((p) => {
    const plan = p.affectionPlans[0];
    const vaultMeta = vaultByParcelId.get(p.id);
    const isVault = vaultMeta != null;
    // Vault rows use VaultEntry.askingPriceFils — Parcel.currentValuation
    // is not written by ensureVaultPrivateParcel and would always be null.
    const currentValuation = isVault
      ? vaultMeta!.priceFils?.toString() ?? null
      : p.currentValuation?.toString() ?? null;
    return {
      id: p.id,
      plotNumber: p.plotNumber,
      district: p.district,
      emirate: p.emirate,
      status: p.status,
      area: p.area,
      geometry: p.geometry,
      currentValuation,
      isVault,
      vaultEntryId: vaultMeta?.entryId ?? null,
      conflictsWithOthers: vaultMeta?.conflicts ?? false,
      plan: plan
        ? {
            projectName: plan.projectName,
            community: plan.community,
            maxFloors: plan.maxFloors,
            maxHeightMeters: plan.maxHeightMeters,
            maxHeightCode: plan.maxHeightCode,
            plotAreaSqm: plan.plotAreaSqm,
            plotAreaSqft: plan.plotAreaSqft,
            maxGfaSqm: plan.maxGfaSqm,
            maxGfaSqft: plan.maxGfaSqft,
            sitePlanIssue: plan.sitePlanIssue?.toISOString() ?? null,
            fetchedAt: plan.fetchedAt?.toISOString() ?? null,
            far: plan.far,
            landUseMix: plan.landUseMix,
            buildingLimitGeometry: plan.buildingLimitGeometry,
            setbacks: plan.setbacks,
            buildingStyle: plan.buildingStyle,
          }
        : null,
    };
  });

  return NextResponse.json({ items });
}
