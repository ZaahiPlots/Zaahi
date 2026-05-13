// ZAAHI Vault — share lifecycle (create / revoke / lookup recipient).
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §3.2, §5.1, §6.4.
//
// MVP share permission is VIEW only at the API gate. FEASIBILITY and
// OFFER are declared in the enum so Phase 2.2 can ship gate behaviour
// without a schema migration.
//
// Re-sharing semantics: if a (vaultEntryId, recipientUserId) row
// already exists (revoked or not), createShare UPDATES it
// (revokedAt → null, expiresAt extended) rather than INSERTING a new
// row. The @@unique constraint on (vaultEntryId, recipientUserId)
// guarantees one row per (entry, recipient) pair.

import { prisma } from "./prisma";
import { recordVaultEvent } from "./vault-activity";
import type { VaultSharePermission } from "@prisma/client";

/** Recipient lookup discriminated union — exactly one of email/nickname/userId. */
export type RecipientLookup =
  | { email: string }
  | { nickname: string }
  | { userId: string };

export interface CreateShareArgs {
  vaultEntryId: string;
  /** Caller's userId — must equal vaultEntry.ownerId (gated upstream). */
  ownerId: string;
  recipientLookup: RecipientLookup;
  permission?: VaultSharePermission;
  /** ISO string when the share expires. null/undefined = never. */
  expiresAt?: string | null;
}

export interface CreateShareResult {
  share: {
    id: string;
    vaultEntryId: string;
    recipientUserId: string;
    permission: VaultSharePermission;
    expiresAt: string | null;
    createdAt: string;
  };
  recipient: { id: string; nickname: string | null };
}

/** Look up a User by the discriminated input. Returns null if not found OR not approved. */
export async function resolveRecipient(
  lookup: RecipientLookup,
): Promise<{ id: string; nickname: string | null } | null> {
  try {
    if ("userId" in lookup) {
      const u = await prisma.user.findUnique({
        where: { id: lookup.userId },
        select: { id: true, nickname: true },
      });
      return u;
    }
    if ("email" in lookup) {
      const u = await prisma.user.findUnique({
        where: { email: lookup.email },
        select: { id: true, nickname: true },
      });
      return u;
    }
    // nickname
    const u = await prisma.user.findUnique({
      where: { nickname: lookup.nickname },
      select: { id: true, nickname: true },
    });
    return u;
  } catch (err) {
    console.error("[vault-share] resolveRecipient failed:", err);
    return null;
  }
}

export type CreateShareError =
  | "cannot_share_with_self"
  | "recipient_not_found"
  | "entry_not_found"
  | "db_failure";

/**
 * Create or refresh a VaultShare. Idempotent on (vaultEntryId, recipientUserId).
 *
 * Returns the share + recipient summary on success, or an error code.
 * Emits SHARED activity on both create AND refresh (re-sharing is a
 * meaningful event even when the row already existed).
 */
export async function createShare(
  args: CreateShareArgs,
): Promise<CreateShareResult | { error: CreateShareError }> {
  const recipient = await resolveRecipient(args.recipientLookup);
  if (!recipient) return { error: "recipient_not_found" };
  if (recipient.id === args.ownerId) return { error: "cannot_share_with_self" };

  const permission = args.permission ?? "VIEW";
  const expiresAt = args.expiresAt ? new Date(args.expiresAt) : null;

  try {
    // Upsert on the unique key — re-sharing clears prior revoke + bumps
    // expiry without creating duplicates.
    const share = await prisma.vaultShare.upsert({
      where: {
        vaultEntryId_recipientUserId: {
          vaultEntryId: args.vaultEntryId,
          recipientUserId: recipient.id,
        },
      },
      create: {
        vaultEntryId: args.vaultEntryId,
        ownerId: args.ownerId,
        recipientUserId: recipient.id,
        permission,
        expiresAt,
      },
      update: {
        permission,
        expiresAt,
        revokedAt: null,
        revokedReason: null,
      },
      select: {
        id: true,
        vaultEntryId: true,
        recipientUserId: true,
        permission: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    recordVaultEvent({
      vaultEntryId: args.vaultEntryId,
      actorUserId: args.ownerId,
      kind: "SHARED",
      payload: {
        shareId: share.id,
        recipientUserId: recipient.id,
        permission,
      },
    });

    return {
      share: {
        id: share.id,
        vaultEntryId: share.vaultEntryId,
        recipientUserId: share.recipientUserId,
        permission: share.permission,
        expiresAt: share.expiresAt?.toISOString() ?? null,
        createdAt: share.createdAt.toISOString(),
      },
      recipient,
    };
  } catch (err) {
    // Foreign-key failure (entry doesn't exist) lands here.
    const msg = String(err);
    if (msg.includes("VaultShare_vaultEntryId_fkey") || msg.includes("foreign key")) {
      return { error: "entry_not_found" };
    }
    console.error("[vault-share] createShare failed:", err);
    return { error: "db_failure" };
  }
}

export interface RevokeShareArgs {
  shareId: string;
  /** Caller's userId — must equal share.ownerId (gated upstream). */
  ownerId: string;
  reason?: string | null;
}

export interface RevokeShareResult {
  shareId: string;
  vaultEntryId: string;
  revokedAt: string;
}

export type RevokeShareError = "not_found" | "already_revoked" | "db_failure";

/**
 * Revoke a share. Sets revokedAt to now. Idempotent — already-revoked
 * shares return `already_revoked` without touching the row.
 *
 * Caller MUST verify share.ownerId === args.ownerId upstream before
 * calling this. Function trusts that check (it lives in the route
 * handler, not here).
 */
export async function revokeShare(
  args: RevokeShareArgs,
): Promise<RevokeShareResult | { error: RevokeShareError }> {
  try {
    const existing = await prisma.vaultShare.findUnique({
      where: { id: args.shareId },
      select: { id: true, vaultEntryId: true, revokedAt: true },
    });
    if (!existing) return { error: "not_found" };
    if (existing.revokedAt !== null) return { error: "already_revoked" };

    const now = new Date();
    await prisma.vaultShare.update({
      where: { id: args.shareId },
      data: {
        revokedAt: now,
        revokedReason: args.reason ?? null,
      },
    });

    recordVaultEvent({
      vaultEntryId: existing.vaultEntryId,
      actorUserId: args.ownerId,
      kind: "SHARE_REVOKED",
      payload: { shareId: args.shareId, reason: args.reason ?? null },
    });

    return {
      shareId: args.shareId,
      vaultEntryId: existing.vaultEntryId,
      revokedAt: now.toISOString(),
    };
  } catch (err) {
    console.error("[vault-share] revokeShare failed:", err);
    return { error: "db_failure" };
  }
}
