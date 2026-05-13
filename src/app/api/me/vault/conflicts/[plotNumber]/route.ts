// ZAAHI Vault — redacted cross-user comparison for a single plot.
//
// GET /api/me/vault/conflicts/[plotNumber]?emirate=...&district=...
// → 200 {
//     plotNumber, emirate, district,
//     entries: Array<{
//       addedByNickname, priceFils, area, landUse, createdAt
//     }>
//   }
// → 404 if caller has no entry for this plot (anti-fishing + the
//   project's standard 404-not-403 pattern from Deal Room — don't leak
//   existence to non-participants by status-code differentiation)
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.2, §6.7.
//
// Server-side enforced: brokerNotes / ownerContact / nextFollowUpAt of
// OTHER users' entries NEVER leave the DB. Only the public-facing facts
// + sharer nickname surface.

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

const QuerySchema = z.object({
  emirate: z.enum(EMIRATES),
  district: z.string().trim().min(1).max(120),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ plotNumber: string }> },
) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { plotNumber } = await params;
  if (!/^\d{5,10}$/.test(plotNumber)) {
    return NextResponse.json({ error: "invalid_plot_number" }, { status: 400 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    emirate: url.searchParams.get("emirate"),
    district: url.searchParams.get("district"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }
  const { emirate, district } = parsed.data;

  // Anti-fishing — caller must own at least one VaultEntry for this
  // plot tuple. Without this check, anyone could enumerate other
  // brokers' entries by guessing plot numbers. 404 (not 403) matches
  // the project's Deal-Room precedent: status code alone shouldn't
  // tell a probe whether a plot has any vault entries at all.
  const callerHasEntry = await prisma.vaultEntry.findFirst({
    where: { ownerId: userId, emirate, district, plotNumber },
    select: { id: true },
  });
  if (!callerHasEntry) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Pull all entries for the plot tuple. Includes the caller's own
  // entry so the UI can show "Your data" alongside "Their data".
  const entries = await prisma.vaultEntry.findMany({
    where: { emirate, district, plotNumber },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      ownerId: true,
      askingPriceFils: true,
      area: true,
      landUse: true,
      createdAt: true,
      owner: { select: { id: true, nickname: true, role: true } },
    },
  });

  return NextResponse.json({
    plotNumber,
    emirate,
    district,
    entries: entries.map((e) => ({
      // Identify the caller's own row so the UI can label it "Your data".
      isYours: e.ownerId === userId,
      addedByUserId: e.ownerId,
      addedByNickname: e.owner?.nickname ?? null,
      addedByRole: e.owner?.role ?? null,
      priceFils: e.askingPriceFils?.toString() ?? null,
      area: e.area,
      landUse: e.landUse,
      createdAt: e.createdAt.toISOString(),
      // INTENTIONALLY OMITTED: brokerNotes, ownerContact, nextFollowUpAt
      // — these are PII / private working memos and never leave the DB
      // for non-owners.
    })),
  });
}
