// ZAAHI Vault — "Add to my vault" from a shared entry.
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.6, §16.1.
//
// When a user clicks "Add to my vault" on an entry shared with them,
// this creates a NEW VaultEntry in their own vault, copying the plot
// facts and asking price but preserving attribution to the original
// sharer. The broker notes and follow-up date STAY PRIVATE to the
// original owner — only the public-facing data crosses over.
//
// Provenance chain grows on each hop:
//   • A creates entry → addedByUserId=A, provenanceChain=null
//   • A shares with B → B's import → addedByUserId=A on B's entry,
//                       provenanceChain=[{userId:A, nickname:A, addedAt}]
//   • B shares with C → C's import → addedByUserId=B on C's entry,
//                       provenanceChain=[
//                         {userId:A, nickname:A, addedAt: tA},
//                         {userId:B, nickname:B, addedAt: tB},
//                       ]
//
// MVP supports the 2-hop case (A→B). Deeper chains arrive in Phase 2.2
// when re-sharing IMPORTED entries is supported.

import { prisma } from "./prisma";
import { recordVaultEvent } from "./vault-activity";
import { recomputeConflictsForPlot } from "./vault-conflict";

export interface ImportSharedEntryArgs {
  /** The VaultShare row authorising the import — caller must be share.recipientUserId. */
  shareId: string;
  /** The caller's userId — must equal share.recipientUserId (gated upstream). */
  recipientUserId: string;
}

export type ImportError =
  | "share_not_found"
  | "share_revoked_or_expired"
  | "not_share_recipient"
  | "already_imported"
  | "db_failure";

export interface ImportResult {
  newVaultEntryId: string;
  sourceEntryId: string;
  sharerUserId: string;
}

/**
 * Import a shared VaultEntry into the recipient's own vault.
 *
 * Creates a new VaultEntry with:
 *   • ownerId            = recipientUserId
 *   • addedByUserId      = original sharer
 *   • importedFromShareId = share.id
 *   • provenanceChain    = appended with the sharer
 *   • Plot identity / geometry / area / landUse / ownerContact / askingPriceFils
 *     copied from the source entry
 *   • brokerNotes        = NULL (private to original owner)
 *   • nextFollowUpAt     = NULL (private)
 *   • stage              = LEAD (recipient starts fresh)
 *
 * Returns the new entry id, or an error code. Fails gracefully on
 * duplicate import (caller already has an entry for this plot).
 */
export async function importSharedEntry(
  args: ImportSharedEntryArgs,
): Promise<ImportResult | { error: ImportError }> {
  try {
    const share = await prisma.vaultShare.findUnique({
      where: { id: args.shareId },
      select: {
        id: true,
        vaultEntryId: true,
        recipientUserId: true,
        revokedAt: true,
        expiresAt: true,
      },
    });
    if (!share) return { error: "share_not_found" };
    if (share.recipientUserId !== args.recipientUserId) {
      return { error: "not_share_recipient" };
    }
    if (share.revokedAt !== null) return { error: "share_revoked_or_expired" };
    if (share.expiresAt !== null && share.expiresAt.getTime() <= Date.now()) {
      return { error: "share_revoked_or_expired" };
    }

    // Load the source entry fully (we need every field that survives the copy).
    const source = await prisma.vaultEntry.findUnique({
      where: { id: share.vaultEntryId },
      select: {
        id: true,
        ownerId: true,
        emirate: true,
        district: true,
        plotNumber: true,
        publicParcelId: true,
        area: true,
        latitude: true,
        longitude: true,
        geometry: true,
        landUse: true,
        askingPriceFils: true,
        ownerContact: true,
        provenanceChain: true,
      },
    });
    if (!source) return { error: "share_not_found" };

    // Anti-self-import — can't happen via the gates above, but defensive.
    if (source.ownerId === args.recipientUserId) {
      return { error: "already_imported" };
    }

    // Look up the sharer's nickname for the provenance chain entry.
    const sharer = await prisma.user.findUnique({
      where: { id: source.ownerId },
      select: { id: true, nickname: true },
    });

    // Build the new provenance chain: append the sharer to whatever was
    // already there (handles 2-hop case for MVP; deeper chains arrive
    // in Phase 2.2 when imported entries can themselves be re-shared).
    const prevChain = Array.isArray(source.provenanceChain)
      ? (source.provenanceChain as Array<Record<string, unknown>>)
      : [];
    const newChain = [
      ...prevChain,
      {
        userId: source.ownerId,
        nickname: sharer?.nickname ?? null,
        addedAt: new Date().toISOString(),
      },
    ];

    let created: { id: string };
    try {
      created = await prisma.vaultEntry.create({
        data: {
          ownerId: args.recipientUserId,
          addedByUserId: source.ownerId,
          importedFromShareId: share.id,
          provenanceChain: newChain as unknown as object,
          emirate: source.emirate,
          district: source.district,
          plotNumber: source.plotNumber,
          publicParcelId: source.publicParcelId,
          area: source.area,
          latitude: source.latitude,
          longitude: source.longitude,
          geometry: source.geometry as unknown as object | undefined,
          landUse: source.landUse,
          askingPriceFils: source.askingPriceFils,
          ownerContact: source.ownerContact as unknown as object | undefined,
          // brokerNotes intentionally NOT copied — stays with original owner
          // nextFollowUpAt intentionally NOT copied — recipient starts fresh
          stage: "LEAD",
          source: "shared-import",
        },
        select: { id: true },
      });
    } catch (err) {
      // Unique constraint (ownerId, emirate, district, plotNumber) —
      // recipient already has an entry for this plot in their vault.
      const msg = String(err);
      if (msg.includes("Unique") || msg.includes("unique constraint") || msg.includes("P2002")) {
        return { error: "already_imported" };
      }
      throw err;
    }

    recordVaultEvent({
      vaultEntryId: created.id,
      actorUserId: args.recipientUserId,
      kind: "IMPORTED_FROM_SHARE",
      payload: {
        sourceVaultEntryId: source.id,
        sharerUserId: source.ownerId,
        shareId: share.id,
      },
    });

    // Conflict recompute — a new vault entry on this plot may now
    // conflict with the source (or other users' entries).
    void recomputeConflictsForPlot(source.emirate, source.district, source.plotNumber);

    return {
      newVaultEntryId: created.id,
      sourceEntryId: source.id,
      sharerUserId: source.ownerId,
    };
  } catch (err) {
    console.error("[vault-import] importSharedEntry failed:", err);
    return { error: "db_failure" };
  }
}
