// ZAAHI Vault — polymorphic entry GET (owner full / share-recipient redacted).
//
// GET /api/vault/entries/[id]
// Returns one of two shapes based on caller's access:
//   • owner     → VaultEntryFull (everything)
//   • recipient → VaultEntryRecipientView (PII-redacted, share metadata added)
//   • neither   → 404 (NOT 403 — preserves the Deal-Room pattern)
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.1.
//
// Side effect for recipients: updates VaultShare.lastViewedAt + emits
// VIEWED_BY_RECIPIENT activity (debounced 1h per recipient to keep the
// feed clean).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { writeActivity } from "@/lib/vault-activity";
import {
  serializeVaultEntryFull,
  serializeVaultEntryForRecipient,
} from "@/lib/vault-serialize";
import { getPriceHistory } from "@/lib/vault-price-history";

export const runtime = "nodejs";

/** Debounce window for VIEWED_BY_RECIPIENT activity per recipient. */
const VIEW_DEBOUNCE_MS = 60 * 60 * 1000; // 1 hour

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const entry = await prisma.vaultEntry.findUnique({
    where: { id },
    include: {
      addedBy: { select: { id: true, nickname: true } },
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
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Owner path — full view.
  if (entry.ownerId === userId) {
    const priceHistory = await getPriceHistory(id, 50);
    return NextResponse.json({
      ...serializeVaultEntryFull(entry),
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
      access: "owner",
    });
  }

  // Recipient path — active share check.
  const now = new Date();
  const share = await prisma.vaultShare.findUnique({
    where: {
      vaultEntryId_recipientUserId: {
        vaultEntryId: id,
        recipientUserId: userId,
      },
    },
    select: {
      id: true,
      permission: true,
      revokedAt: true,
      expiresAt: true,
      lastViewedAt: true,
    },
  });

  if (
    !share ||
    share.revokedAt !== null ||
    (share.expiresAt !== null && share.expiresAt.getTime() <= now.getTime())
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Owner nickname for sharedBy header.
  const owner = await prisma.user.findUnique({
    where: { id: entry.ownerId },
    select: { id: true, nickname: true },
  });

  // Bump lastViewedAt + emit debounced view activity.
  const lastViewedAt = share.lastViewedAt;
  const shouldEmit =
    !lastViewedAt || now.getTime() - lastViewedAt.getTime() >= VIEW_DEBOUNCE_MS;

  await prisma.vaultShare.update({
    where: { id: share.id },
    data: { lastViewedAt: now },
  });

  if (shouldEmit) {
    void writeActivity({
      vaultEntryId: id,
      actorUserId: userId,
      kind: "VIEWED_BY_RECIPIENT",
      payload: { shareId: share.id },
    });
  }

  const view = serializeVaultEntryForRecipient(
    entry,
    { permission: share.permission },
    owner ?? { id: entry.ownerId, nickname: null },
  );

  return NextResponse.json({
    ...view,
    access: "share",
    // shareId surfaced so the client's "Add to my vault" button can POST
    // to /api/vault/shared-with-me/[shareId]/import without an extra lookup.
    shareId: share.id,
  });
}
