// ZAAHI Vault — GeoJSON feed for the "shared with me" map layer.
//
// GET /api/vault/shared-with-me/map → { type: "FeatureCollection", features }
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.1, §7.
//
// PII-redacted server-side: brokerNotes / nextFollowUpAt / ownerContact.notes
// are NOT included — only public-facing facts (plot number, district, stage,
// price, geometry/coordinates).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

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
          owner: { select: { id: true, nickname: true } },
        },
      },
    },
  });

  const features: GeoJSON.Feature[] = [];
  for (const s of shares) {
    const e = s.vaultEntry;
    const props = {
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
  }

  return NextResponse.json({
    type: "FeatureCollection" as const,
    features,
  });
}
