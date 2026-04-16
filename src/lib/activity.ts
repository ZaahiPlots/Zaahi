// ── ZAAHI activity log writer ────────────────────────────────────────
// Fire-and-forget helper for the Phase 1 ActivityLog table. Appends a
// row per meaningful user action so Phase 5 timeline dashboards will
// have historical data the day they ship (rather than starting from
// zero).
//
// Rules (must stay stable — callers trust them):
//   1. Never throw. Every failure swallowed with console.error.
//   2. Never block the caller. Callers do `void logActivity(...)` —
//      we return a Promise<void> but handlers should not await it.
//   3. No PII in payload. IDs only (parcelId, dealId, etc). No emails,
//      phones, names. CLAUDE.md "НЕ пиши PII в console.log" applies to
//      this table too since it's a structured log.
//   4. `kind` is UPPER_SNAKE_CASE and stable — Phase 5 dashboards will
//      group by these values. Adding new kinds is fine; renaming is
//      a migration.
//
// Kinds currently written:
//   USER_LOGIN        — successful sign-in (via /api/users/sync)
//   PLOT_VIEW         — user opened a parcel detail or SidePanel
//   FAVORITE_ADDED    — user saved a parcel to their shortlist
//   LISTING_CREATED   — user added a new parcel (direct or submit flow)

import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type ActivityKind =
  | "USER_LOGIN"
  | "PLOT_VIEW"
  | "FAVORITE_ADDED"
  | "LISTING_CREATED";

export interface LogActivityArgs {
  userId: string;
  kind: ActivityKind;
  /** Optional reference id — typically parcelId, dealId, or similar. */
  ref?: string | null;
  /** Optional JSON payload. IDs and context only — NEVER PII. */
  payload?: Record<string, unknown> | null;
}

/**
 * Append an ActivityLog row. Fire-and-forget.
 *
 * Callers pass the return promise to `void`:
 *     void logActivity({ userId, kind: "PLOT_VIEW", ref: parcelId });
 *
 * Returns the created row id on success, undefined on failure. The id is
 * useful if a caller wants to correlate, but most callers ignore it.
 */
export async function logActivity(args: LogActivityArgs): Promise<string | undefined> {
  try {
    const row = await prisma.activityLog.create({
      data: {
        userId: args.userId,
        kind: args.kind,
        ref: args.ref ?? null,
        payload: (args.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      select: { id: true },
    });
    return row.id;
  } catch (e) {
    // Never throw — activity logging must not break the caller.
    const msg = e instanceof Error ? e.message : "unknown";
    console.error(`[activity] ${args.kind} write failed:`, msg);
    return undefined;
  }
}
