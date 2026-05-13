// ZAAHI Vault — entry detail / update / delete (owner-only).
//
// GET    /api/me/vault/entries/[id]   → VaultEntryFull (owner shape) | 404
// PATCH  /api/me/vault/entries/[id]   body: VaultEntryUpdate → VaultEntryFull
// DELETE /api/me/vault/entries/[id]   → 204
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.1.
//
// 404 (not 403) on access denial — same pattern as Deal Room handlers.

import { NextRequest, NextResponse } from "next/server";
import { Prisma, VaultStage } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { recordVaultEvent } from "@/lib/vault-activity";
import { recomputeConflictsForPlot } from "@/lib/vault-conflict";
import { recordPriceChange, getPriceHistory } from "@/lib/vault-price-history";
import { serializeVaultEntryFull } from "@/lib/vault-serialize";

export const runtime = "nodejs";

const OwnerContactSchema = z
  .object({
    name: z.string().trim().max(120).optional(),
    phone: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/).optional(),
    email: z.string().email().optional(),
    role: z.string().trim().max(40).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

/**
 * Update schema — identity fields (emirate / district / plotNumber) are
 * IMMUTABLE post-creation. Use DELETE + re-create if a typo needs
 * fixing, so attribution and history stay attached to the right plot.
 */
const VaultEntryUpdateSchema = z
  .object({
    area: z.number().positive().max(1e9).nullable().optional(),
    latitude: z.number().min(22).max(27).nullable().optional(),
    longitude: z.number().min(51).max(57).nullable().optional(),
    geometry: z.unknown().optional(),
    landUse: z.string().trim().max(64).nullable().optional(),
    askingPriceFils: z
      .string()
      .regex(/^\d{1,16}$/, "askingPriceFils must be a non-negative integer string")
      .nullable()
      .optional(),
    priceChangeNote: z.string().max(500).optional(), // surfaces in price-history table; ignored if price didn't change
    ownerContact: OwnerContactSchema.nullable().optional(),
    brokerNotes: z.string().max(8000).nullable().optional(),
    stage: z.nativeEnum(VaultStage).optional(),
    source: z.string().trim().max(40).nullable().optional(),
    nextFollowUpAt: z.string().datetime().nullable().optional(),
  })
  .strict();

/** Fields whose change triggers a conflict recompute. */
const CONFLICT_RELEVANT_FIELDS = new Set([
  "askingPriceFils",
  "area",
  "landUse",
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getApprovedUserId(_req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const entry = await prisma.vaultEntry.findUnique({
    where: { id },
    include: {
      shares: {
        where: { revokedAt: null },
        select: {
          id: true,
          recipientUserId: true,
          recipient: { select: { id: true, nickname: true } },
          permission: true,
          expiresAt: true,
          createdAt: true,
          lastViewedAt: true,
        },
      },
      addedBy: { select: { id: true, nickname: true } },
    },
  });

  // 404 instead of 403 — don't leak existence to non-owners.
  if (!entry || entry.ownerId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const full = serializeVaultEntryFull(entry);
  const priceHistory = await getPriceHistory(id, 50);

  return NextResponse.json({
    ...full,
    addedBy: entry.addedBy,
    shares: entry.shares.map((s) => ({
      id: s.id,
      recipient: s.recipient,
      permission: s.permission,
      expiresAt: s.expiresAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      lastViewedAt: s.lastViewedAt?.toISOString() ?? null,
    })),
    priceHistory,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = VaultEntryUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues.slice(0, 10) },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Verify ownership BEFORE the update so 404 lands cleanly.
  const existing = await prisma.vaultEntry.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      emirate: true,
      district: true,
      plotNumber: true,
      askingPriceFils: true,
      area: true,
      landUse: true,
      stage: true,
    },
  });
  if (!existing || existing.ownerId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Detect which conflict-relevant fields actually changed so we know
  // whether to trigger a recompute.
  let conflictRelevantChanged = false;

  // Handle price change separately — recordPriceChange writes the
  // VaultPriceHistory row + PRICE_CHANGED activity + recomputes conflicts.
  let priceChangeHandled = false;
  if (body.askingPriceFils !== undefined) {
    const newPriceStr = body.askingPriceFils ?? "0";
    const oldPriceStr = existing.askingPriceFils?.toString() ?? null;

    // Explicit "set to null" — clear the field; no history row.
    if (body.askingPriceFils === null) {
      if (oldPriceStr !== null) {
        await prisma.vaultEntry.update({
          where: { id },
          data: { askingPriceFils: null },
        });
        conflictRelevantChanged = true;
      }
      priceChangeHandled = true;
    } else if (oldPriceStr !== newPriceStr) {
      const result = await recordPriceChange({
        vaultEntryId: id,
        newPriceFils: newPriceStr,
        actorUserId: userId,
        source: "manual",
        note: body.priceChangeNote ?? null,
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      conflictRelevantChanged = true;
      priceChangeHandled = true;
    } else {
      // No-op write of the same price — just mark handled, skip update.
      priceChangeHandled = true;
    }
  }

  // Build the data object for everything ELSE that changed.
  const data: Prisma.VaultEntryUpdateInput = {};
  let stageChanged = false;
  let noteChanged = false;
  let followUpChanged = false;

  if (body.area !== undefined && body.area !== existing.area) {
    data.area = body.area;
    conflictRelevantChanged = true;
  }
  if (body.latitude !== undefined) data.latitude = body.latitude;
  if (body.longitude !== undefined) data.longitude = body.longitude;
  if (body.geometry !== undefined) {
    data.geometry =
      body.geometry === null
        ? Prisma.DbNull
        : (body.geometry as Prisma.InputJsonValue);
  }
  if (body.landUse !== undefined && body.landUse !== existing.landUse) {
    data.landUse = body.landUse;
    conflictRelevantChanged = true;
  }
  if (body.ownerContact !== undefined) {
    data.ownerContact =
      body.ownerContact === null
        ? Prisma.DbNull
        : (body.ownerContact as Prisma.InputJsonValue);
  }
  if (body.brokerNotes !== undefined) {
    data.brokerNotes = body.brokerNotes;
    noteChanged = true;
  }
  if (body.stage !== undefined && body.stage !== existing.stage) {
    data.stage = body.stage;
    stageChanged = true;
  }
  if (body.source !== undefined) data.source = body.source;
  if (body.nextFollowUpAt !== undefined) {
    data.nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
    followUpChanged = true;
  }

  // Apply the non-price updates in a single round-trip.
  if (Object.keys(data).length > 0) {
    await prisma.vaultEntry.update({ where: { id }, data });
  }

  // Emit per-change activity (stage / note / follow-up).
  if (stageChanged) {
    recordVaultEvent({
      vaultEntryId: id,
      actorUserId: userId,
      kind: "STAGE_CHANGED",
      payload: { from: existing.stage, to: body.stage },
    });
  }
  if (noteChanged) {
    recordVaultEvent({ vaultEntryId: id, actorUserId: userId, kind: "NOTE_ADDED" });
  }
  if (followUpChanged) {
    recordVaultEvent({
      vaultEntryId: id,
      actorUserId: userId,
      kind: "FOLLOW_UP_LOGGED",
      payload: { nextFollowUpAt: body.nextFollowUpAt ?? null },
    });
  }

  // Trigger conflict recompute if any conflict-relevant field changed
  // AND the recompute wasn't already fired by recordPriceChange.
  if (conflictRelevantChanged && !priceChangeHandled) {
    void recomputeConflictsForPlot(
      existing.emirate,
      existing.district,
      existing.plotNumber,
    );
  }

  // Re-fetch full shape to return.
  const fresh = await prisma.vaultEntry.findUnique({
    where: { id },
    include: {
      shares: {
        where: { revokedAt: null },
        select: {
          id: true,
          recipient: { select: { id: true, nickname: true } },
          permission: true,
          expiresAt: true,
          createdAt: true,
          lastViewedAt: true,
        },
      },
      addedBy: { select: { id: true, nickname: true } },
    },
  });
  if (!fresh) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const priceHistory = await getPriceHistory(id, 50);

  return NextResponse.json({
    ...serializeVaultEntryFull(fresh),
    addedBy: fresh.addedBy,
    shares: fresh.shares.map((s) => ({
      id: s.id,
      recipient: s.recipient,
      permission: s.permission,
      expiresAt: s.expiresAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      lastViewedAt: s.lastViewedAt?.toISOString() ?? null,
    })),
    priceHistory,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership BEFORE the delete so 404 lands cleanly.
  const existing = await prisma.vaultEntry.findUnique({
    where: { id },
    select: {
      ownerId: true,
      emirate: true,
      district: true,
      plotNumber: true,
    },
  });
  if (!existing || existing.ownerId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Cascade: VaultShare / VaultActivity / VaultPriceHistory all carry
  // onDelete: Cascade on vaultEntryId per the schema. Nothing to clean
  // up here.
  await prisma.vaultEntry.delete({ where: { id } });

  // Recompute conflicts on the plot tuple — when a participant leaves,
  // remaining entries may flip back to non-conflict (count drops to 1).
  void recomputeConflictsForPlot(
    existing.emirate,
    existing.district,
    existing.plotNumber,
  );

  return new NextResponse(null, { status: 204 });
}
