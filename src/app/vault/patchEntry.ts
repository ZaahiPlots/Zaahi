// Shared PATCH helper for /vault inline edits. Returns null on success or an
// error label; callers own optimistic state and revert on a non-null result.

import { apiFetch } from "@/lib/api-fetch";

export async function patchVaultEntry(
  entryId: string,
  body: Record<string, unknown>,
): Promise<string | null> {
  try {
    const r = await apiFetch(`/api/me/vault/entries/${entryId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return r.ok ? null : `Save failed (${r.status})`;
  } catch (e) {
    console.error("[vault-patch] failed:", e);
    return "Network error";
  }
}

/** Mirrors OwnerContactSchema.phone in the PATCH route. */
export const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;
