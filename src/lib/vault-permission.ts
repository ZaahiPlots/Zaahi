// ZAAHI Vault — access-gate helper.
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §4.
//
// Resolves the caller's relationship to a VaultEntry:
//   "owner"  — caller created the entry (entry.ownerId === userId)
//   "share"  — caller has an active VaultShare row
//              (revokedAt IS NULL AND (expiresAt IS NULL OR > now()))
//   "none"   — neither; route handlers return 404 (not 403) to avoid
//              leaking entry existence to non-participants
//
// Owner check is done first (cheap O(1) on indexed ownerId). Share
// check is a single lookup on the (vaultEntryId, recipientUserId)
// unique index.

import { prisma } from "./prisma";

export type VaultAccess = "owner" | "share" | "none";

/**
 * Returns the caller's access tier on the given vault entry.
 *
 * NEVER throws — falls back to "none" on DB errors so the upstream
 * 404 response is consistent.
 */
export async function getVaultEntryAccess(
  userId: string,
  entryId: string,
): Promise<VaultAccess> {
  try {
    const entry = await prisma.vaultEntry.findUnique({
      where: { id: entryId },
      select: { ownerId: true },
    });
    if (!entry) return "none";
    if (entry.ownerId === userId) return "owner";

    const share = await prisma.vaultShare.findUnique({
      where: {
        vaultEntryId_recipientUserId: {
          vaultEntryId: entryId,
          recipientUserId: userId,
        },
      },
      select: { revokedAt: true, expiresAt: true },
    });
    if (!share) return "none";
    if (share.revokedAt !== null) return "none";
    if (share.expiresAt !== null && share.expiresAt.getTime() <= Date.now()) {
      return "none";
    }
    return "share";
  } catch (err) {
    console.error("[vault-permission] getVaultEntryAccess failed:", err);
    return "none";
  }
}

/**
 * Convenience: load the entry AND the access tier in one shot. Returns
 * `{ entry: null, access: "none" }` when the row doesn't exist OR the
 * caller has no access — same 404-safe shape.
 *
 * Returns the entry as Prisma's default `VaultEntry` shape (all fields
 * selected). API routes that need a narrower select can do their own
 * `prisma.vaultEntry.findUnique` after `getVaultEntryAccess()` returns
 * "owner" or "share".
 *
 * The caller should use the returned `access` to decide whether to
 * redact PII via vault-serialize.ts.
 */
export async function getVaultEntryWithAccess(
  userId: string,
  entryId: string,
): Promise<{
  entry: import("@prisma/client").VaultEntry | null;
  access: VaultAccess;
}> {
  try {
    const entry = await prisma.vaultEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) return { entry: null, access: "none" };
    if (entry.ownerId === userId) return { entry, access: "owner" };

    const share = await prisma.vaultShare.findUnique({
      where: {
        vaultEntryId_recipientUserId: {
          vaultEntryId: entryId,
          recipientUserId: userId,
        },
      },
      select: { revokedAt: true, expiresAt: true },
    });
    if (!share || share.revokedAt !== null) {
      return { entry: null, access: "none" };
    }
    if (share.expiresAt !== null && share.expiresAt.getTime() <= Date.now()) {
      return { entry: null, access: "none" };
    }
    return { entry, access: "share" };
  } catch (err) {
    console.error("[vault-permission] getVaultEntryWithAccess failed:", err);
    return { entry: null, access: "none" };
  }
}
