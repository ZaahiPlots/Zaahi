// ZAAHI Vault — price-history writer + change orchestrator.
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §16.2.
//
// Every PATCH that changes VaultEntry.askingPriceFils must funnel
// through this module — it does three things atomically (well,
// best-effort transactional with fire-and-forget side-effects):
//
//   1. Update VaultEntry.askingPriceFils → new value
//   2. Append a VaultPriceHistory row (immutable audit trail)
//   3. Emit PRICE_CHANGED activity (entry feed + dashboard shadow row)
//   4. Trigger conflict recompute on the plot tuple (price is a
//      conflict-relevant field — see vault-conflict.ts)
//
// Step 4 is fire-and-forget — it's eventually consistent and runs in
// the background while the API returns. Steps 1–2 happen inside a
// Prisma $transaction.

import { prisma } from "./prisma";
import { recordVaultEvent } from "./vault-activity";
import { recomputeConflictsForPlot } from "./vault-conflict";

export interface RecordPriceChangeArgs {
  vaultEntryId: string;
  /** New price in fils. Pass as a BigInt-compatible string (matches the API's wire format). */
  newPriceFils: string;
  /** User performing the change — typically vaultEntry.ownerId. */
  actorUserId: string;
  /** Provenance of the change. Default "manual" (broker typed it). */
  source?: "manual" | "import" | "promote-sync";
  /** Optional reason — surfaces in the price-history table next to the value. */
  note?: string | null;
}

export type PriceChangeError = "entry_not_found" | "invalid_price" | "db_failure";

export interface PriceChangeResult {
  vaultEntryId: string;
  oldPriceFils: string | null;
  newPriceFils: string;
  historyId: string;
}

/**
 * Update VaultEntry.askingPriceFils + write a VaultPriceHistory row in
 * a single transaction. Emits PRICE_CHANGED activity and triggers
 * conflict recompute on success.
 *
 * Returns the change record on success or an error code. Never throws
 * for expected failures (entry not found, invalid price).
 */
export async function recordPriceChange(
  args: RecordPriceChangeArgs,
): Promise<PriceChangeResult | { error: PriceChangeError }> {
  let newPrice: bigint;
  try {
    newPrice = BigInt(args.newPriceFils);
    if (newPrice < BigInt(0)) return { error: "invalid_price" };
  } catch {
    return { error: "invalid_price" };
  }

  try {
    // Pull current state so we can record the old price in the history
    // row and detect no-op writes.
    const entry = await prisma.vaultEntry.findUnique({
      where: { id: args.vaultEntryId },
      select: {
        id: true,
        askingPriceFils: true,
        emirate: true,
        district: true,
        plotNumber: true,
      },
    });
    if (!entry) return { error: "entry_not_found" };

    const oldPrice = entry.askingPriceFils;

    // No-op short-circuit — but still write a history row if the source
    // is "promote-sync" (the promote flow records the canonical price
    // even when it's the same as before, for audit completeness).
    if (oldPrice === newPrice && args.source !== "promote-sync") {
      return {
        vaultEntryId: entry.id,
        oldPriceFils: oldPrice?.toString() ?? null,
        newPriceFils: newPrice.toString(),
        historyId: "",
      };
    }

    const [_, history] = await prisma.$transaction([
      prisma.vaultEntry.update({
        where: { id: entry.id },
        data: { askingPriceFils: newPrice },
        select: { id: true },
      }),
      prisma.vaultPriceHistory.create({
        data: {
          vaultEntryId: entry.id,
          priceFils: newPrice,
          setByUserId: args.actorUserId,
          source: args.source ?? "manual",
          note: args.note ?? null,
        },
        select: { id: true },
      }),
    ]);

    recordVaultEvent({
      vaultEntryId: entry.id,
      actorUserId: args.actorUserId,
      kind: "PRICE_CHANGED",
      payload: {
        oldPriceFils: oldPrice?.toString() ?? null,
        newPriceFils: newPrice.toString(),
        source: args.source ?? "manual",
        historyId: history.id,
      },
    });

    // Conflict recompute — fire-and-forget, eventually consistent.
    void recomputeConflictsForPlot(entry.emirate, entry.district, entry.plotNumber);

    return {
      vaultEntryId: entry.id,
      oldPriceFils: oldPrice?.toString() ?? null,
      newPriceFils: newPrice.toString(),
      historyId: history.id,
    };
  } catch (err) {
    console.error("[vault-price-history] recordPriceChange failed:", err);
    return { error: "db_failure" };
  }
}

/**
 * Read the price-history timeline for an entry. Newest-first.
 * Caller is responsible for access control (owner only) — this
 * function does NOT gate.
 */
export async function getPriceHistory(
  vaultEntryId: string,
  limit = 100,
): Promise<
  Array<{
    id: string;
    priceFils: string;
    setByUserId: string;
    source: string;
    note: string | null;
    createdAt: string;
  }>
> {
  try {
    const rows = await prisma.vaultPriceHistory.findMany({
      where: { vaultEntryId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        priceFils: true,
        setByUserId: true,
        source: true,
        note: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      priceFils: r.priceFils.toString(),
      setByUserId: r.setByUserId,
      source: r.source,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("[vault-price-history] getPriceHistory failed:", err);
    return [];
  }
}
