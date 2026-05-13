// ZAAHI Vault — pre-create plot lookup for the upload wizard.
//
// POST /api/me/vault/plot-lookup  body: { emirate, district, plotNumber }
// → 200 {
//     source: "dda" | "not_found",
//     existing: VaultEntrySummary | null,
//     ddaData?: { area, geometry, landUse, latitude, longitude, district } // when source === "dda"
//   }
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.2, §6.1.
//
// Two checks in one round-trip:
//   1. Does the caller already have a vault entry for this plot? Surfaces
//      it so the wizard can short-circuit to edit-mode.
//   2. Is the plot in our DDA scrape (existing Parcel + AffectionPlan)?
//      If yes, auto-fills the wizard with area, geometry, landUse.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

const EMIRATES = [
  "DUBAI",
  "ABU_DHABI",
  "SHARJAH",
  "AJMAN",
  "UAQ",
  "RAK",
  "FUJAIRAH",
] as const;

const PlotLookupSchema = z.object({
  emirate: z.enum(EMIRATES),
  district: z.string().trim().min(1).max(120),
  plotNumber: z.string().trim().regex(/^\d{5,10}$/, "plotNumber must be 5-10 digits"),
});

export async function POST(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = PlotLookupSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }
  const { emirate, district, plotNumber } = parsed.data;

  // 1) Does the caller already have an entry for this plot?
  const existing = await prisma.vaultEntry.findUnique({
    where: {
      ownerId_emirate_district_plotNumber: {
        ownerId: userId,
        emirate,
        district,
        plotNumber,
      },
    },
    select: {
      id: true,
      plotNumber: true,
      district: true,
      emirate: true,
      stage: true,
      askingPriceFils: true,
      createdAt: true,
    },
  });

  // 2) Is the plot in our scraped Parcel index? Match on plotNumber only
  //    (district may diverge from the user-typed value vs DDA's authoritative
  //    PROJECT_NAME). For the wizard, a hit means we can prefill facts.
  const ddaParcel = await prisma.parcel.findFirst({
    where: { plotNumber, emirate: { in: ["Dubai", "DUBAI"] } },
    select: {
      id: true,
      area: true,
      geometry: true,
      latitude: true,
      longitude: true,
      district: true,
      affectionPlans: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
        select: { landUseMix: true },
      },
    },
  });

  const existingSummary = existing
    ? {
        id: existing.id,
        plotNumber: existing.plotNumber,
        district: existing.district,
        emirate: existing.emirate,
        stage: existing.stage,
        askingPriceFils: existing.askingPriceFils?.toString() ?? null,
        createdAt: existing.createdAt.toISOString(),
      }
    : null;

  if (!ddaParcel) {
    return NextResponse.json({
      source: "not_found" as const,
      existing: existingSummary,
    });
  }

  // Pull primary land-use from the most-recent affectionPlan if available.
  let primaryLandUse: string | null = null;
  const mix = ddaParcel.affectionPlans[0]?.landUseMix;
  if (Array.isArray(mix) && mix.length > 0) {
    const first = mix[0] as { category?: string; sub?: string };
    primaryLandUse = first.category ?? first.sub ?? null;
  }

  return NextResponse.json({
    source: "dda" as const,
    existing: existingSummary,
    ddaData: {
      area: ddaParcel.area,
      geometry: ddaParcel.geometry,
      landUse: primaryLandUse,
      latitude: ddaParcel.latitude,
      longitude: ddaParcel.longitude,
      district: ddaParcel.district,
    },
  });
}
