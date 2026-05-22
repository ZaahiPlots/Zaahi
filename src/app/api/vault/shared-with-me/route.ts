// ZAAHI Vault — list of entries shared TO the caller.
//
// GET /api/vault/shared-with-me  ?cursor&limit
// → { items: VaultEntryShareSummary[], nextCursor, total }
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.1.
//
// Each item bundles VaultEntry summary + share metadata (sharedBy
// nickname + permission + expiresAt). Recipient-redacted fields
// (brokerNotes, nextFollowUpAt, ownerContact.notes) are NOT served
// from this list view — the detail GET enforces that.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") || null;
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Math.max(1, Math.min(100, Number.isFinite(limitRaw) ? limitRaw : 50));

  const now = new Date();
  const rowsRaw = await prisma.vaultShare.findMany({
    where: {
      recipientUserId: userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      permission: true,
      expiresAt: true,
      createdAt: true,
      vaultEntry: {
        select: {
          id: true,
          plotNumber: true,
          emirate: true,
          district: true,
          stage: true,
          askingPriceFils: true,
          landUse: true,
          conflictsWithOthers: true,
          createdAt: true,
          updatedAt: true,
          owner: { select: { id: true, nickname: true } },
        },
      },
    },
  });

  const hasMore = rowsRaw.length > limit;
  const rows = hasMore ? rowsRaw.slice(0, limit) : rowsRaw;
  const nextCursor = hasMore ? rows[rows.length - 1].id : null;

  const items = rows.map((s) => ({
    shareId: s.id,
    sharedBy: s.vaultEntry.owner,
    sharedAt: s.createdAt.toISOString(),
    permission: s.permission,
    expiresAt: s.expiresAt?.toISOString() ?? null,
    entry: {
      id: s.vaultEntry.id,
      plotNumber: s.vaultEntry.plotNumber,
      emirate: s.vaultEntry.emirate,
      district: s.vaultEntry.district,
      stage: s.vaultEntry.stage,
      askingPriceFils: s.vaultEntry.askingPriceFils?.toString() ?? null,
      landUse: s.vaultEntry.landUse,
      conflictsWithOthers: s.vaultEntry.conflictsWithOthers,
      createdAt: s.vaultEntry.createdAt.toISOString(),
      updatedAt: s.vaultEntry.updatedAt.toISOString(),
    },
  }));

  const total = await prisma.vaultShare.count({
    where: {
      recipientUserId: userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });

  return NextResponse.json({ items, nextCursor, total });
}
