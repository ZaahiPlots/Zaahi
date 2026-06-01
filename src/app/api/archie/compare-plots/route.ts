// POST /api/archie/compare-plots
//
// Fetch 2-5 plots in one round trip. Drives Archie's `compare_plots`
// tool — used to answer "compare 6457940 and 6730979" with a side-by-
// side summary. Same field set + privacy semantics as
// /api/archie/plot-details/[plotNumber] — this endpoint is just a
// batched version. Returns `found` rows and a list of `missing` plot
// numbers so the LLM can say "I couldn't find 6457999".
//
// Auth: getApprovedUserId.

import { NextRequest, NextResponse } from "next/server";
import { ParcelStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

const MIN_COMPARE = 2;
const MAX_COMPARE = 5;

interface CompareBody {
  plotNumbers?: unknown;
}

interface LandUseEntry {
  category?: unknown;
  sub?: unknown;
}

function readLandUse(landUseMix: unknown):
  | { category: string; sub?: string }
  | undefined {
  if (!Array.isArray(landUseMix) || landUseMix.length === 0) return undefined;
  const first = landUseMix[0] as LandUseEntry | undefined;
  if (typeof first?.category !== "string") return undefined;
  const out: { category: string; sub?: string } = { category: first.category };
  if (typeof first.sub === "string") out.sub = first.sub;
  return out;
}

export async function POST(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CompareBody;
  try {
    body = (await req.json()) as CompareBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!Array.isArray(body.plotNumbers)) {
    return NextResponse.json(
      { error: "bad_plot_numbers", message: "plotNumbers must be an array" },
      { status: 400 },
    );
  }

  // Dedup + validate each plot number; cap the array at MAX_COMPARE.
  // Anything that fails the regex is dropped (and surfaces in missing
  // alongside real misses — same UX from the LLM's perspective).
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const raw of body.plotNumbers) {
    if (typeof raw !== "string") continue;
    const n = raw.trim();
    if (!/^\d{5,10}$/.test(n)) {
      invalid.push(n);
      continue;
    }
    if (seen.has(n)) continue;
    seen.add(n);
    valid.push(n);
    if (valid.length >= MAX_COMPARE) break;
  }

  if (valid.length < MIN_COMPARE) {
    return NextResponse.json(
      {
        error: "too_few",
        message: `compare needs at least ${MIN_COMPARE} valid plot numbers`,
      },
      { status: 400 },
    );
  }

  const parcels = await prisma.parcel.findMany({
    where: { plotNumber: { in: valid } },
    select: {
      id: true,
      plotNumber: true,
      emirate: true,
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
          community: true,
          masterDeveloper: true,
          plotAreaSqft: true,
          plotAreaSqm: true,
          maxGfaSqft: true,
          maxGfaSqm: true,
          maxFloors: true,
          maxHeightMeters: true,
          maxHeightCode: true,
          far: true,
          landUseMix: true,
          sitePlanIssue: true,
          sitePlanExpiry: true,
        },
      },
    },
  });

  // Privacy gate per row: VAULT_PRIVATE parcels owned by another user
  // are dropped silently (same 404-equivalent behaviour as
  // /plot-details). We have to check the caller's vault membership for
  // each VAULT_PRIVATE row separately — done with one batched query.
  const vaultParcelIds = parcels
    .filter((p) => p.status === ParcelStatus.VAULT_PRIVATE)
    .map((p) => p.id);
  const ownedVaultIds = new Set<string>();
  if (vaultParcelIds.length > 0) {
    const entries = await prisma.vaultEntry.findMany({
      where: {
        ownerId: userId,
        publicParcelId: { in: vaultParcelIds },
      },
      select: { publicParcelId: true },
    });
    for (const e of entries) {
      if (e.publicParcelId) ownedVaultIds.add(e.publicParcelId);
    }
  }

  const found = parcels.filter(
    (p) =>
      p.status !== ParcelStatus.VAULT_PRIVATE || ownedVaultIds.has(p.id),
  );
  const foundNumbers = new Set(found.map((p) => p.plotNumber));
  const missing = [
    ...valid.filter((n) => !foundNumbers.has(n)),
    ...invalid,
  ];

  // Same compact shape as /plot-details. Optional keys are omitted
  // when the underlying field is null so the LLM stays honest about
  // missing data instead of guessing.
  const plots = found.map((p) => {
    const plan = p.affectionPlans[0];
    const landUse = readLandUse(plan?.landUseMix);
    type Row = {
      plotNumber: string;
      district: string;
      status: ParcelStatus;
      isCallersVault: boolean;
      project?: string;
      community?: string;
      masterDeveloper?: string;
      landUse?: string;
      landUseSub?: string;
      priceAed?: number;
      areaSqft?: number;
      plotAreaSqft?: number;
      plotAreaSqm?: number;
      maxGfaSqft?: number;
      maxGfaSqm?: number;
      maxFloors?: number;
      maxHeightMeters?: number;
      maxHeightCode?: string;
      far?: number;
      sitePlanIssue?: string;
      sitePlanExpiry?: string;
      openToJV?: boolean;
    };
    const out: Row = {
      plotNumber: p.plotNumber,
      district: p.district,
      status: p.status,
      isCallersVault: p.status === ParcelStatus.VAULT_PRIVATE,
    };
    if (plan?.projectName) out.project = plan.projectName;
    if (plan?.community) out.community = plan.community;
    if (plan?.masterDeveloper) out.masterDeveloper = plan.masterDeveloper;
    if (landUse) {
      out.landUse = landUse.category;
      if (landUse.sub) out.landUseSub = landUse.sub;
    }
    if (p.currentValuation != null) {
      out.priceAed = Math.round(Number(p.currentValuation) / 100);
    }
    if (p.area > 0) out.areaSqft = Math.round(p.area);
    if (plan?.plotAreaSqft != null) out.plotAreaSqft = Math.round(plan.plotAreaSqft);
    if (plan?.plotAreaSqm != null) out.plotAreaSqm = Math.round(plan.plotAreaSqm);
    if (plan?.maxGfaSqft != null) out.maxGfaSqft = Math.round(plan.maxGfaSqft);
    if (plan?.maxGfaSqm != null) out.maxGfaSqm = Math.round(plan.maxGfaSqm);
    if (plan?.maxFloors != null) out.maxFloors = plan.maxFloors;
    if (plan?.maxHeightMeters != null) out.maxHeightMeters = plan.maxHeightMeters;
    if (plan?.maxHeightCode) out.maxHeightCode = plan.maxHeightCode;
    if (plan?.far != null) out.far = plan.far;
    if (plan?.sitePlanIssue) out.sitePlanIssue = plan.sitePlanIssue.toISOString().slice(0, 10);
    if (plan?.sitePlanExpiry) out.sitePlanExpiry = plan.sitePlanExpiry.toISOString().slice(0, 10);
    if (p.openToJV) out.openToJV = true;
    return out;
  });

  return NextResponse.json({
    ok: true,
    found: plots.length,
    missing,
    plots,
  });
}
