// ZAAHI Vault — in-app notification writer.
//
// Wraps the existing Notification model (src/lib/activity.ts uses
// ActivityLog; this lib writes the user-facing Notification rows that
// drive the dashboard bell / header surface).
//
// Notification.kind values per spec §3.3 — UPPER_SNAKE_CASE, stable.
//
// MVP scope: three kinds — share received, share revoked, conflict
// detected. The spec also names VAULT_SHARE_VIEWED (sharer-pinged-when-
// recipient-views) and VAULT_PROMOTED_TO_PUBLIC (recipients-pinged-when-
// shared-entry-is-promoted), but neither has a wired UX in MVP — defer
// to Phase 2.2 when the sharer-side activity surface and post-promote
// recipient flow are designed. See diagnostic-day12.md §7.2 G5, G6.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type VaultNotificationKind =
  | "VAULT_SHARE_RECEIVED"
  | "VAULT_SHARE_REVOKED"
  | "VAULT_CONFLICT_DETECTED";

const MAX_PAYLOAD_BYTES = 4 * 1024;

/**
 * Append a Notification row for the given user. Fire-and-forget:
 * never throws, never blocks the caller. Callers should use
 * `void notifyUser(...)`.
 */
export async function notifyUser(
  userId: string,
  kind: VaultNotificationKind,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const safePayload = capPayload(payload);
    await prisma.notification.create({
      data: {
        userId,
        kind,
        payload: (safePayload as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.error(`[vault-notifications] notifyUser ${kind} failed:`, err);
  }
}

function capPayload(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!payload) return null;
  try {
    if (JSON.stringify(payload).length > MAX_PAYLOAD_BYTES) {
      console.error("[vault-notifications] payload too large — dropping");
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
