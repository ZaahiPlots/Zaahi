// ZAAHI Vault — pre-create plot lookup for the upload wizard.
//
// POST /api/me/vault/plot-lookup  body: { emirate, district, plotNumber }
// → 200 {
//     source: "dda" | "zaahi_stored" | "dda_unavailable" | "not_found",
//     existing: VaultEntrySummary | null,
//     ddaData?: {
//       area, geometry, landUse, latitude, longitude, district,
//       ddaSnapshot?,            // present only when sourced from live DDA
//       snapshotDate?,           // present only when source is zaahi_stored
//     }
//   }
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.2, §6.1.
//
// Lookup order:
//   1. Does the caller already have a vault entry for this plot? Short-circuit
//      to edit-mode.
//   2. Is the plot in our local curated Parcel index? Hit → return cached.
//   3. Is the plot in our own stored DDA data (99,126 Dubai plots, harvested
//      before the 2026-09 token wall — no network call for polygon/area)?
//      Hit → "zaahi_stored", dated, enriched with today's PlotInfo +
//      BuildingLimit (best-effort — a different DDA subsystem, not behind
//      the token wall). (2026-09-26, docs/agent-log/2026-09-26-vault-local-fallback.md,
//      docs/agent-log/2026-09-26-vault-stored-live-plotinfo.md)
//   4. Live DDA fallback (BASIC_LAND_BASE/MapServer/2). Hit → return live
//      data + ddaSnapshot for storage on the entry. DDA erroring (token
//      wall, HTTP failure) → "dda_unavailable", distinct from a genuine miss
//      (2026-09-26, docs/agent-log/2026-09-26-dda-token-restore.md).
//   5. Miss everything → "not_found"; wizard goes to manual entry.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { fetchFullDdaData } from "@/lib/dda-plot-lookup";
import {
  lookupStoredDdaPlot,
  enrichStoredHit,
  STORED_DDA_SNAPSHOT_DATE,
} from "@/lib/dda-stored-plot-lookup";
import { emirateMatchVariants } from "@/lib/emirate";

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
  // emirateMatchVariants returns title-case + SCREAMING_SNAKE + the
  // raw input so the lookup bridges the cohort wizard's enum and the
  // listing/AffectionPlan title-case storage convention.
  const ddaParcel = await prisma.parcel.findFirst({
    where: {
      plotNumber,
      emirate: { in: emirateMatchVariants(emirate) },
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

  // 3) Our own stored DDA data (99,126 Dubai plots harvested before
  //    BASIC_LAND_BASE's 2026-09 token wall — see
  //    docs/agent-log/2026-09-26-vault-local-fallback.md). No network call
  //    for the polygon/area/base land use. Checked before live DDA so a
  //    walled/slow live call never blocks a plot we already have on disk.
  //    Never a substitute for the Parcel table (step 2) — that stays
  //    authoritative when both have the plot.
  //
  //    2026-09-26 (this task): a stored hit is enriched with today's
  //    PlotInfo + BuildingLimit — a different DDA subsystem from
  //    BASIC_LAND_BASE, still open. Polygon and area always stay from the
  //    stored snapshot; land use, floors, FAR, height, setbacks and the
  //    building-limit polygon come from PlotInfo/BuildingLimit when they
  //    answer, otherwise fall back to the stored values (only land use has
  //    one). Best-effort — see enrichStoredHit; a PlotInfo/BuildingLimit
  //    failure never turns a stored hit into a miss.
  if (emirate === "DUBAI") {
    const stored = lookupStoredDdaPlot(plotNumber);
    if (stored) {
      const enrichment = await enrichStoredHit(plotNumber, { landUse: stored.landUse });
      return NextResponse.json({
        source: "zaahi_stored" as const,
        existing: existingSummary,
        ddaData: {
          area: stored.area,
          geometry: stored.geometry,
          landUse: enrichment.landUse,
          latitude: stored.latitude,
          longitude: stored.longitude,
          district: stored.district || district,
          snapshotDate: STORED_DDA_SNAPSHOT_DATE,
          // Same shape the live-DDA branch below returns — lets the
          // wizard/entries route treat a PlotInfo-enriched stored hit
          // exactly like a live DDA hit (writeAffectionPlan, not the
          // vault-manual synthesis).
          plan: enrichment.plan,
          buildingLimit: enrichment.buildingLimit,
          fieldSources: enrichment.fieldSources,
        },
      });
    }
  }

  // 4) Live DDA fallback — call BASIC_LAND_BASE/2 + PlotInfo + BuildingLimit
  //    for plots not in our curated index or stored data. Phase 2 of vault
  //    refactor (founder spec 2026-05-30) brings parity with seed-dda by
  //    chaining all three DDA fetches so the wizard surfaces the same
  //    affection plan a public listing would. ~0.5–2s end-to-end; plan or
  //    buildingLimit can come back null on master plots / missing layer 8.
  if (emirate === "DUBAI") {
    const live = await fetchFullDdaData(plotNumber);
    if (live.status === "hit") {
      const { basic, plan, buildingLimit } = live.data;
      return NextResponse.json({
        source: "dda" as const,
        existing: existingSummary,
        ddaData: {
          area: basic.area,
          geometry: basic.geometry,
          landUse: basic.landUse,
          latitude: basic.latitude,
          longitude: basic.longitude,
          district: basic.district || district,
          ddaSnapshot: basic.ddaSnapshot,
          // Full affection plan + building limit polygon — Phase 2.
          // Either may be null on master plots / missing data.
          plan,
          buildingLimit,
        },
      });
    }
    if (live.status === "unavailable") {
      // DDA errored (token wall, HTTP failure, etc.) — this is an outage,
      // not evidence the plot doesn't exist. Never collapse into not_found.
      console.error("[plot-lookup] DDA unavailable for", plotNumber, live.reason);
      return NextResponse.json({
        source: "dda_unavailable" as const,
        existing: existingSummary,
      });
    }
    // live.status === "not_found" falls through to the not_found response below.
  }

  return NextResponse.json({
    source: "not_found" as const,
    existing: existingSummary,
  });
}
