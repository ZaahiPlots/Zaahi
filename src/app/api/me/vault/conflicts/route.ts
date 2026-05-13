// ZAAHI Vault — caller's entries currently in conflict.
//
// GET /api/me/vault/conflicts → { items: VaultEntrySummary[] }
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.2, §6.7.
// Drives the "Conflicts (N)" tab on /vault.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.vaultEntry.findMany({
    where: { ownerId: userId, conflictsWithOthers: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      plotNumber: true,
      emirate: true,
      district: true,
      stage: true,
      askingPriceFils: true,
      source: true,
      nextFollowUpAt: true,
      conflictsWithOthers: true,
      conflictedFields: true,
      addedByUserId: true,
      addedBy: { select: { nickname: true } },
      createdAt: true,
      updatedAt: true,
      _count: { select: { shares: { where: { revokedAt: null } } } },
    },
  });

  const items = rows.map((r) => ({
    id: r.id,
    plotNumber: r.plotNumber,
    emirate: r.emirate,
    district: r.district,
    stage: r.stage,
    askingPriceFils: r.askingPriceFils?.toString() ?? null,
    source: r.source,
    nextFollowUpAt: r.nextFollowUpAt?.toISOString() ?? null,
    shareCount: r._count.shares,
    conflictsWithOthers: r.conflictsWithOthers,
    conflictedFields: r.conflictedFields,
    addedByUserId: r.addedByUserId,
    addedByNickname: r.addedBy?.nickname ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return NextResponse.json({ items, total: items.length });
}
