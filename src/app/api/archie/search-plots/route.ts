// POST /api/archie/search-plots
//
// Filter the parcel catalogue for Archie's `search_plots` tool. Founder
// spec 2026-06-01 Archie Wave 1: read-and-return (no map side-effects)
// so the LLM can compose a textual answer ("found 3 plots in Arjan
// under 10M AED").
//
// Privacy:
//   - Public statuses only (LISTED, VERIFIED, IN_DEAL). VAULT_PRIVATE
//     parcels are NEVER returned by this endpoint, even the caller's
//     own — search exists for the public catalogue; users browse their
//     vault separately via /vault and the toggle_vault_only map tool.
//   - No owner email, phone, name, or PlotClaim data leaks into the
//     response. Tool result only includes data already visible on the
//     hover card / SidePanel of any public listing.
//
// Returns a compact JSON payload (short keys, omitted nulls) so the
// LLM context budget survives even a 10-row response.
//
// Auth: getApprovedUserId (same gate as the rest of /api/archie).

import { NextRequest, NextResponse } from "next/server";
import { ParcelStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

const LAND_USE_CATEGORIES = new Set([
  "RESIDENTIAL",
  "COMMERCIAL",
  "MIXED_USE",
  "HOTEL",
  "INDUSTRIAL",
  "EDUCATIONAL",
  "HEALTHCARE",
  "AGRICULTURAL",
  "FUTURE_DEVELOPMENT",
]);
const SEARCH_STATUSES: ParcelStatus[] = [
  ParcelStatus.LISTED,
  ParcelStatus.VERIFIED,
  ParcelStatus.IN_DEAL,
];

interface SearchBody {
  district?: string;
  landUse?: string;
  status?: string;
  minPriceAed?: number;
  maxPriceAed?: number;
  minAreaSqft?: number;
  maxAreaSqft?: number;
  minFloors?: number;
  maxFloors?: number;
  openToJV?: boolean;
  sortBy?: "price" | "area" | "gfa";
  limit?: number;
}

interface SearchRow {
  plotNumber: string;
  district: string;
  project?: string;
  landUse?: string;
  status: ParcelStatus;
  priceAed?: number;
  areaSqft?: number;
  maxGfaSqft?: number;
  far?: number;
  maxFloors?: number;
  openToJV?: boolean;
}

function readLandUse(landUseMix: unknown): string | undefined {
  if (!Array.isArray(landUseMix) || landUseMix.length === 0) return undefined;
  const first = landUseMix[0] as { category?: unknown } | undefined;
  return typeof first?.category === "string" ? first.category : undefined;
}

export async function POST(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const limit = Math.min(Math.max(1, Math.round(body.limit ?? 5)), 10);
  const sortBy: "price" | "area" | "gfa" =
    body.sortBy === "area" || body.sortBy === "gfa" ? body.sortBy : "price";

  // Status filter — caller may narrow to one of the 3 public statuses.
  // Anything outside the allow-list is silently dropped (keeps the
  // privacy guarantee even if the LLM hallucinates VAULT_PRIVATE).
  const wantedStatus =
    typeof body.status === "string" &&
    SEARCH_STATUSES.includes(body.status as ParcelStatus)
      ? (body.status as ParcelStatus)
      : null;

  const where: Prisma.ParcelWhereInput = {
    status: wantedStatus ? { equals: wantedStatus } : { in: SEARCH_STATUSES },
  };

  // District — case-insensitive contains. DDA district names are short
  // ("ARJAN", "BUSINESS BAY"), so contains beats exact for natural
  // language queries.
  if (typeof body.district === "string" && body.district.trim().length > 0) {
    where.district = {
      contains: body.district.trim(),
      mode: "insensitive",
    };
  }

  // Price filter in fils — DB column stores fils, the tool exposes AED
  // for the LLM convenience.
  if (typeof body.minPriceAed === "number" && body.minPriceAed > 0) {
    where.currentValuation = {
      ...(where.currentValuation as object | undefined),
      gte: BigInt(Math.floor(body.minPriceAed * 100)),
    };
  }
  if (typeof body.maxPriceAed === "number" && body.maxPriceAed > 0) {
    where.currentValuation = {
      ...(where.currentValuation as object | undefined),
      lte: BigInt(Math.floor(body.maxPriceAed * 100)),
    };
  }

  // Area filter on Parcel.area (sqft, market standard).
  if (typeof body.minAreaSqft === "number" && body.minAreaSqft > 0) {
    where.area = { ...(where.area as object | undefined), gte: body.minAreaSqft };
  }
  if (typeof body.maxAreaSqft === "number" && body.maxAreaSqft > 0) {
    where.area = { ...(where.area as object | undefined), lte: body.maxAreaSqft };
  }

  if (body.openToJV === true) where.openToJV = true;

  const orderBy: Prisma.ParcelOrderByWithRelationInput =
    sortBy === "area"
      ? { area: "asc" }
      : { currentValuation: "asc" }; // gfa requires plan join — handled post-fetch

  // Land-use + floor filtering hits AffectionPlan fields. Doing both as
  // a relation `some` clause keeps it server-side.
  if (
    typeof body.landUse === "string" &&
    LAND_USE_CATEGORIES.has(body.landUse.toUpperCase())
  ) {
    const cat = body.landUse.toUpperCase();
    where.affectionPlans = {
      some: {
        landUseMix: {
          // Prisma JSON path filter on Postgres. The land use array
          // shape is [{category: "RESIDENTIAL", ...}, …]; we look for
          // the category in the first row only — that's how the
          // ZAAHI_LANDUSE_COLOR + map filter both interpret the field.
          path: ["0", "category"],
          equals: cat,
        },
      },
    };
  }
  if (typeof body.minFloors === "number" && body.minFloors > 0) {
    where.affectionPlans = {
      ...(where.affectionPlans as object | undefined),
      some: {
        ...((where.affectionPlans as { some?: object } | undefined)?.some ?? {}),
        maxFloors: { gte: Math.floor(body.minFloors) },
      },
    };
  }
  if (typeof body.maxFloors === "number" && body.maxFloors > 0) {
    where.affectionPlans = {
      ...(where.affectionPlans as object | undefined),
      some: {
        ...((where.affectionPlans as { some?: object } | undefined)?.some ?? {}),
        maxFloors: { lte: Math.floor(body.maxFloors) },
      },
    };
  }

  // Two queries: count for the "total" hint, findMany for the rows.
  // count is cheap and lets the LLM say "10 of 47" instead of guessing.
  const [total, rows] = await Promise.all([
    prisma.parcel.count({ where }),
    prisma.parcel.findMany({
      where,
      orderBy,
      take: limit,
      select: {
        plotNumber: true,
        district: true,
        status: true,
        currentValuation: true,
        area: true,
        openToJV: true,
        affectionPlans: {
          orderBy: { fetchedAt: "desc" },
          take: 1,
          select: {
            projectName: true,
            maxGfaSqft: true,
            far: true,
            maxFloors: true,
            landUseMix: true,
          },
        },
      },
    }),
  ]);

  const results: SearchRow[] = rows.map((p) => {
    const plan = p.affectionPlans[0];
    const out: SearchRow = {
      plotNumber: p.plotNumber,
      district: p.district,
      status: p.status,
    };
    if (plan?.projectName) out.project = plan.projectName;
    const cat = readLandUse(plan?.landUseMix);
    if (cat) out.landUse = cat;
    if (p.currentValuation != null) {
      out.priceAed = Math.round(Number(p.currentValuation) / 100);
    }
    if (p.area > 0) out.areaSqft = Math.round(p.area);
    if (plan?.maxGfaSqft != null) out.maxGfaSqft = Math.round(plan.maxGfaSqft);
    if (plan?.far != null) out.far = plan.far;
    if (plan?.maxFloors != null) out.maxFloors = plan.maxFloors;
    if (p.openToJV) out.openToJV = true;
    return out;
  });

  // gfa sort applied client-side because it lives on AffectionPlan and
  // we want a single Prisma query above. Fine for limit<=10.
  if (sortBy === "gfa") {
    results.sort((a, b) => (b.maxGfaSqft ?? 0) - (a.maxGfaSqft ?? 0));
  }

  return NextResponse.json({
    ok: true,
    count: results.length,
    total,
    results,
  });
}
