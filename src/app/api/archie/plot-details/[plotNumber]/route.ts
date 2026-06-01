// GET /api/archie/plot-details/[plotNumber]
//
// Read full data for one plot by its plot number. Drives Archie's
// `get_plot_details` tool — used to answer "what's the FAR of 6457940",
// "tell me about plot 6730979", etc.
//
// Privacy:
//   - VAULT_PRIVATE rows owned by ANOTHER user respond 404. The caller
//     gets the same "not found" they would for a non-existent plot, no
//     hint that the plot exists behind a vault wall.
//   - The caller's OWN VAULT_PRIVATE rows return the same payload as
//     a public listing plus `isCallersVault: true`. Founder browses
//     their own vault through Archie naturally; no extra surface for
//     that flag yet.
//   - PII (owner email/phone/name, claim list) never leaves this
//     endpoint. The flat shape below mirrors what the SidePanel already
//     shows the user, nothing extra.
//
// Auth: getApprovedUserId — same gate as the rest of /api/archie.

import { NextRequest, NextResponse } from "next/server";
import { ParcelStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ plotNumber: string }> };

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

export async function GET(_req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(_req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { plotNumber } = await params;
  if (!/^\d{5,10}$/.test(plotNumber)) {
    return NextResponse.json({ error: "bad_plot_number" }, { status: 400 });
  }

  const parcel = await prisma.parcel.findFirst({
    where: { plotNumber },
    select: {
      id: true,
      plotNumber: true,
      emirate: true,
      district: true,
      status: true,
      currentValuation: true,
      area: true,
      openToJV: true,
      ownerId: true,
      verifiedOwnerUserId: true,
      affectionPlans: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
        select: {
          projectName: true,
          community: true,
          masterDeveloper: true,
          plotAreaSqm: true,
          plotAreaSqft: true,
          maxGfaSqm: true,
          maxGfaSqft: true,
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

  if (!parcel) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // VAULT_PRIVATE privacy gate (founder spec 2026-06-01 Q1).
  // Other users' vault rows respond with the same 404 that a missing
  // plotNumber would — no signal that the plot exists.
  if (parcel.status === ParcelStatus.VAULT_PRIVATE) {
    const ownEntry = await prisma.vaultEntry.findFirst({
      where: { ownerId: userId, publicParcelId: parcel.id },
      select: { id: true },
    });
    if (!ownEntry) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  }

  const plan = parcel.affectionPlans[0];
  const landUse = readLandUse(plan?.landUseMix);

  // Compact, null-omitting payload (founder spec — preserve LLM
  // context budget). Every field except plotNumber / district / status
  // is optional so the LLM knows to phrase missing fields as
  // "not specified" rather than guess.
  type Out = {
    ok: true;
    plotNumber: string;
    id: string;
    emirate: string;
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

  const out: Out = {
    ok: true,
    plotNumber: parcel.plotNumber,
    id: parcel.id,
    emirate: parcel.emirate,
    district: parcel.district,
    status: parcel.status,
    isCallersVault: parcel.status === ParcelStatus.VAULT_PRIVATE,
  };

  if (plan?.projectName) out.project = plan.projectName;
  if (plan?.community) out.community = plan.community;
  if (plan?.masterDeveloper) out.masterDeveloper = plan.masterDeveloper;
  if (landUse) {
    out.landUse = landUse.category;
    if (landUse.sub) out.landUseSub = landUse.sub;
  }
  if (parcel.currentValuation != null) {
    out.priceAed = Math.round(Number(parcel.currentValuation) / 100);
  }
  if (parcel.area > 0) out.areaSqft = Math.round(parcel.area);
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
  if (parcel.openToJV) out.openToJV = true;

  return NextResponse.json(out);
}
