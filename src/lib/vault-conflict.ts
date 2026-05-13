// ZAAHI Vault — cross-user conflict detection (LITE, informational).
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §15.
//
// When ≥ 2 users have a VaultEntry for the same (emirate, district,
// plotNumber) tuple, AND any conflict-relevant field disagrees beyond
// tolerance, ALL participating entries get `conflictsWithOthers = true`
// and `conflictedFields` populated with the disagreeing values.
//
// MVP scope is informational only — banner in the UI, no DISPUTED status,
// no admin arbitration, no aggregate dashboard. Phase 2.2+ may layer those
// on once cohort signal indicates what brokers want.
//
// Trigger points (all in API handlers, not here):
//   • POST /api/me/vault/entries           — after create
//   • PATCH /api/me/vault/entries/[id]     — if any conflict-relevant
//                                            field changed
//   • DELETE /api/me/vault/entries/[id]    — to clear conflicts when a
//                                            participant disappears
//
// Time complexity: O(N) per plot tuple where N is the number of
// VaultEntry rows for that plot (typically 1–5). The compound index
// `[emirate, district, plotNumber]` makes the lookup fast.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { writeActivity } from "./vault-activity";

// Tolerances — kept as named constants so cohort feedback can tune
// without touching call sites. Per spec §15.5.

/** Relative price tolerance — < 5% spread is NOT a conflict. */
const PRICE_TOLERANCE_REL = 0.05;

/** Relative area tolerance — < 2% spread is NOT a conflict. */
const AREA_TOLERANCE_REL = 0.02;

/** Conflict-relevant fields. Order matters for stable conflictedFields output. */
const CONFLICT_FIELDS = ["askingPriceFils", "area", "landUse"] as const;
type ConflictField = (typeof CONFLICT_FIELDS)[number];

/** Per-entry, per-field value snapshot for the conflictedFields payload. */
interface FieldValue {
  userId: string;
  value: string | number | null;
}

/** The disagreement record stored in VaultEntry.conflictedFields. */
interface ConflictedFieldRecord {
  field: ConflictField;
  values: FieldValue[];
}

/**
 * Recompute conflict state for every VaultEntry on the given plot tuple.
 *
 * Idempotent — safe to call multiple times. Emits CONFLICT_DETECTED /
 * CONFLICT_RESOLVED activity ONLY on the entries where the flag
 * transitions (not on every recompute).
 *
 * Fire-and-forget: callers should `void recomputeConflictsForPlot(...)`
 * after mutating an entry; the recompute is eventually consistent (next
 * read sees the new flag state, max latency = one recompute call).
 */
export async function recomputeConflictsForPlot(
  emirate: string,
  district: string,
  plotNumber: string,
): Promise<void> {
  try {
    const entries = await prisma.vaultEntry.findMany({
      where: { emirate, district, plotNumber },
      select: {
        id: true,
        ownerId: true,
        askingPriceFils: true,
        area: true,
        landUse: true,
        conflictsWithOthers: true,
      },
    });

    // Less than 2 entries on this plot — no conflict is possible.
    // Clear the flag on any stale row (e.g. one of two participants just
    // deleted their entry).
    if (entries.length < 2) {
      for (const e of entries) {
        if (e.conflictsWithOthers) {
          await prisma.vaultEntry.update({
            where: { id: e.id },
            data: { conflictsWithOthers: false, conflictedFields: Prisma.DbNull },
          });
          void writeActivity({ vaultEntryId: e.id, kind: "CONFLICT_RESOLVED" });
        }
      }
      return;
    }

    // Compute pairwise disagreements field-by-field.
    const conflicts: ConflictedFieldRecord[] = [];
    for (const field of CONFLICT_FIELDS) {
      const values: FieldValue[] = [];
      for (const e of entries) {
        const raw = readField(e, field);
        if (raw === null) continue;
        values.push({ userId: e.ownerId, value: raw });
      }
      if (values.length < 2) continue; // need at least two populated to disagree
      if (fieldHasDisagreement(field, values)) {
        conflicts.push({ field, values });
      }
    }

    const hasAnyConflict = conflicts.length > 0;

    // Update flags. Only fire activity events on entries whose flag
    // actually transitions — avoids spamming the activity feed.
    for (const e of entries) {
      const wasConflict = e.conflictsWithOthers;
      if (wasConflict === hasAnyConflict) {
        // Even if the flag is unchanged, the conflictedFields payload
        // may have shifted (e.g. a third entry joined). Refresh it.
        if (hasAnyConflict) {
          await prisma.vaultEntry.update({
            where: { id: e.id },
            data: { conflictedFields: conflicts as unknown as Prisma.InputJsonValue },
          });
        }
        continue;
      }
      await prisma.vaultEntry.update({
        where: { id: e.id },
        data: {
          conflictsWithOthers: hasAnyConflict,
          conflictedFields: hasAnyConflict
            ? (conflicts as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
        },
      });
      void writeActivity({
        vaultEntryId: e.id,
        kind: hasAnyConflict ? "CONFLICT_DETECTED" : "CONFLICT_RESOLVED",
      });
    }
  } catch (err) {
    console.error("[vault-conflict] recomputeConflictsForPlot failed:", err);
  }
}

/** Extract the conflict-relevant value from an entry row. */
function readField(
  entry: {
    askingPriceFils: bigint | null;
    area: number | null;
    landUse: string | null;
  },
  field: ConflictField,
): string | number | null {
  switch (field) {
    case "askingPriceFils":
      return entry.askingPriceFils === null
        ? null
        : entry.askingPriceFils.toString();
    case "area":
      return entry.area;
    case "landUse":
      return entry.landUse;
  }
}

/** True if at least one pair in `values` disagrees beyond field tolerance. */
function fieldHasDisagreement(field: ConflictField, values: FieldValue[]): boolean {
  if (values.length < 2) return false;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (pairDisagrees(field, values[i].value, values[j].value)) return true;
    }
  }
  return false;
}

/** Field-aware pairwise comparator. */
function pairDisagrees(
  field: ConflictField,
  a: string | number | null,
  b: string | number | null,
): boolean {
  if (a === null || b === null) return false; // null is "no opinion", not a conflict
  if (field === "landUse") {
    return String(a).trim().toUpperCase() !== String(b).trim().toUpperCase();
  }
  if (field === "askingPriceFils") {
    return relativeDiff(BigInt(String(a)), BigInt(String(b))) > PRICE_TOLERANCE_REL;
  }
  if (field === "area") {
    return relativeDiff(Number(a), Number(b)) > AREA_TOLERANCE_REL;
  }
  return false;
}

/** |a − b| / max(a, b). Returns 0 when both are 0. */
function relativeDiff(a: number | bigint, b: number | bigint): number {
  const an = typeof a === "bigint" ? Number(a) : a;
  const bn = typeof b === "bigint" ? Number(b) : b;
  const max = Math.max(Math.abs(an), Math.abs(bn));
  if (max === 0) return 0;
  return Math.abs(an - bn) / max;
}
