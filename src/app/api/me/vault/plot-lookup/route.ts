// ZAAHI Vault — pre-create plot lookup for the upload wizard.
//
// POST /api/me/vault/plot-lookup  body: { emirate, district, plotNumber }
// → 200 {
//     source: "dda" | "not_found",
//     existing: VaultEntrySummary | null,
//     ddaData?: {
//       area, geometry, landUse, latitude, longitude, district,
//       ddaSnapshot?,            // present only when sourced from live DDA
//     }
//   }
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.2, §6.1.
//
// Lookup order:
//   1. Does the caller already have a vault entry for this plot? Short-circuit
//      to edit-mode.
//   2. Is the plot in our local curated Parcel index? Hit → return cached.
//   3. Live DDA fallback (BASIC_LAND_BASE/MapServer/2). One fetch, no token,
//      ~0.5s. Hit → return live data + ddaSnapshot for storage on the entry.
//   4. Miss everything → "not_found"; wizard goes to manual entry.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { fetchFullDdaData } from "@/lib/dda-plot-lookup";

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
  //
  // AD-1 hardcode fix (founder spec 2026-06-01, completes D11): was
  // `emirate: { in: ["Dubai", "DUBAI"] }` — pinned the lookup to Dubai
  // even when the caller's body declared a different emirate. AD plots
  // (Saadiyat, Yas Island, Reem, etc) that already lived in our Parcel
  // table returned `source: not_found` because of this filter, forcing
  // every AD vault entry into manual coords entry from cold start.
  //
  // The body schema already enforces `emirate: z.enum(EMIRATES)`
  // (line 42), so we can trust `emirate` here. Prisma stores parcels
  // title-case ("Dubai", "Abu Dhabi", "Sharjah", …) while the cohort
  // wizard ships SCREAMING_SNAKE_CASE ("DUBAI", "ABU_DHABI"), so we
  // normalise + accept both spellings to bridge the two conventions.
  const normalisedEmirate =
    emirate.charAt(0).toUpperCase() +
    emirate.slice(1).toLowerCase().replace(/_/g, " ");
  const ddaParcel = await prisma.parcel.findFirst({
    where: {
      plotNumber,
      emirate: { in: [normalisedEmirate, emirate.toUpperCase(), emirate] },
    },
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

  if (ddaParcel) {
    // Hit in curated Parcel index — use cached data.
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
        // ddaSnapshot omitted — Parcel-cached plots use AffectionPlan join.
      },
    });
  }

  // 3) Live DDA fallback — call BASIC_LAND_BASE/2 + PlotInfo + BuildingLimit
  //    for plots not in our curated index. Phase 2 of vault refactor
  //    (founder spec 2026-05-30) brings parity with seed-dda by chaining
  //    all three DDA fetches so the wizard surfaces the same affection
  //    plan a public listing would. ~0.5–2s end-to-end; plan or
  //    buildingLimit can come back null on master plots / missing layer 8.
  if (emirate === "DUBAI") {
    const live = await fetchFullDdaData(plotNumber);
    if (live) {
      return NextResponse.json({
        source: "dda" as const,
        existing: existingSummary,
        ddaData: {
          area: live.basic.area,
          geometry: live.basic.geometry,
          landUse: live.basic.landUse,
          latitude: live.basic.latitude,
          longitude: live.basic.longitude,
          district: live.basic.district || district,
          ddaSnapshot: live.basic.ddaSnapshot,
          // Full affection plan + building limit polygon — Phase 2.
          // Either may be null on master plots / missing data.
          plan: live.plan,
          buildingLimit: live.buildingLimit,
        },
      });
    }
  }

  return NextResponse.json({
    source: "not_found" as const,
    existing: existingSummary,
  });
}
