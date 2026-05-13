// ZAAHI Vault — in-app notification writer.
//
// Wraps the existing Notification model (src/lib/activity.ts uses
// ActivityLog; this lib writes the user-facing Notification rows that
// drive the dashboard bell / header surface).
//
// Notification.kind values per spec §3.3 — UPPER_SNAKE_CASE, stable.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type VaultNotificationKind =
  | "VAULT_SHARE_RECEIVED"
  | "VAULT_SHARE_VIEWED"
  | "VAULT_SHARE_REVOKED"
  | "VAULT_CONFLICT_DETECTED"
  | "VAULT_PROMOTED_TO_PUBLIC";

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
      console.warn("[vault-notifications] payload too large — dropping");
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
