// ZAAHI Vault — activity log writer.
//
// Entry-centric audit log for the VaultEntry pipeline (see
// docs/specs/phase-2/private-plot-vault/spec.md §3.3).
//
// Two parallel sinks per event, by design (Phase 1 finding R5 from
// the third-pass spec review — easy to forget one of them):
//
//   1. VaultActivity row     — keyed by vaultEntryId, drives the
//                              side-panel activity feed in the UI
//   2. ActivityLog row       — keyed by userId, drives the
//                              dashboard "Recent Activity" surface
//
// Use `recordVaultEvent()` — the wrapper that hits both sinks
// fire-and-forget. Direct `writeActivity()` is exported only for
// system events with no actor (e.g. CONFLICT_DETECTED auto-fired
// during conflict recompute), where the ActivityLog shadow row is
// inappropriate.
//
// Rules (must stay stable — callers trust them):
//   1. Never throw. Every failure swallowed with console.error.
//   2. Never block the caller. Use `void recordVaultEvent(...)`.
//   3. No PII in payload. IDs only — same rule as activity.ts.
//   4. `kind` is UPPER_SNAKE_CASE and stable. Adding new kinds is fine;
//      renaming is a migration.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { logActivity, type ActivityKind } from "./activity";

/** Closed enum of VaultActivity.kind values. */
export type VaultActivityKind =
  | "CREATED"
  | "STAGE_CHANGED"
  | "PRICE_CHANGED"
  | "NOTE_ADDED"
  | "FOLLOW_UP_LOGGED"
  | "SHARED"
  | "SHARE_REVOKED"
  | "VIEWED_BY_RECIPIENT"
  | "IMPORTED_FROM_SHARE"
  | "PROMOTED_TO_PUBLIC"
  | "CONFLICT_DETECTED"
  | "CONFLICT_RESOLVED";

/** Map VaultActivityKind to the corresponding ActivityLog (user-centric) kind. */
const VAULT_KIND_TO_ACTIVITY_KIND: Record<VaultActivityKind, ActivityKind | null> = {
  CREATED: "VAULT_ENTRY_CREATED",
  STAGE_CHANGED: "VAULT_STAGE_CHANGED",
  PRICE_CHANGED: "VAULT_PRICE_CHANGED",
  NOTE_ADDED: null, // too noisy for user dashboard; entry feed only
  FOLLOW_UP_LOGGED: null,
  SHARED: "VAULT_SHARED",
  SHARE_REVOKED: "VAULT_SHARE_REVOKED",
  VIEWED_BY_RECIPIENT: null, // entry feed only — sharer doesn't need a dashboard row per view
  IMPORTED_FROM_SHARE: "VAULT_IMPORTED_FROM_SHARE",
  PROMOTED_TO_PUBLIC: "VAULT_PROMOTED_TO_PUBLIC",
  CONFLICT_DETECTED: "VAULT_CONFLICT_DETECTED",
  CONFLICT_RESOLVED: null, // auto-resolution doesn't warrant a user notification
};

/** Maximum serialised payload size accepted; larger payloads are dropped to null. */
const MAX_PAYLOAD_BYTES = 4 * 1024;

export interface WriteActivityArgs {
  vaultEntryId: string;
  kind: VaultActivityKind;
  actorUserId?: string | null;
  payload?: Record<string, unknown> | null;
}

/**
 * Write a single VaultActivity row. Entry-centric only. Use this for
 * system-fired events with no actor; otherwise prefer `recordVaultEvent`.
 *
 * Fire-and-forget: never throws, never returns row id, callers should
 * NOT await it for back-pressure.
 */
export async function writeActivity(args: WriteActivityArgs): Promise<void> {
  try {
    const payload = capPayload(args.payload);
    await prisma.vaultActivity.create({
      data: {
        vaultEntryId: args.vaultEntryId,
        actorUserId: args.actorUserId ?? null,
        kind: args.kind,
        payload: payload ? (payload as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  } catch (err) {
    console.error("[vault-activity] writeActivity failed:", err);
  }
}

export interface RecordVaultEventArgs extends WriteActivityArgs {
  /** Optional reference id for the ActivityLog row (typically vaultEntryId). */
  ref?: string | null;
}

/**
 * Record a vault event in BOTH sinks — VaultActivity (entry-centric)
 * and ActivityLog (user-centric, when actorUserId is set and the kind
 * maps to an ActivityKind).
 *
 * The most common helper to call from API handlers.
 */
export function recordVaultEvent(args: RecordVaultEventArgs): void {
  // Sink 1 — entry-centric VaultActivity (always)
  void writeActivity(args);

  // Sink 2 — user-centric ActivityLog (only when we have an actor AND
  // the kind maps to a dashboard-relevant ActivityKind).
  const actorId = args.actorUserId;
  if (!actorId) return;
  const activityKind = VAULT_KIND_TO_ACTIVITY_KIND[args.kind];
  if (!activityKind) return;
  void logActivity({
    userId: actorId,
    kind: activityKind,
    ref: args.ref ?? args.vaultEntryId,
    payload: capPayload(args.payload) ?? null,
  });
}

/** Drop payloads larger than MAX_PAYLOAD_BYTES — protect the DB from runaway writes. */
function capPayload(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!payload) return null;
  try {
    const serialised = JSON.stringify(payload);
    if (serialised.length > MAX_PAYLOAD_BYTES) {
      console.warn(
        `[vault-activity] payload size ${serialised.length}B exceeds ${MAX_PAYLOAD_BYTES}B cap — dropping`,
      );
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
