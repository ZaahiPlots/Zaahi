// ZAAHI Vault — "Add to my vault" from a shared entry.
//
// POST /api/vault/shared-with-me/[id]/import
//   The [id] in the URL is the VaultShare row id, not the entry id.
// → 201 { newVaultEntryId, sourceEntryId, sharerUserId }
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.1, §6.6.
//
// The actual import logic lives in src/lib/vault-import.ts. This route
// is the thin auth-gated wrapper.

import { NextRequest, NextResponse } from "next/server";
import { getApprovedUserId } from "@/lib/auth";
import { importSharedEntry } from "@/lib/vault-import";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const result = await importSharedEntry({
    shareId: id,
    recipientUserId: userId,
  });

  if ("error" in result) {
    const status =
      result.error === "share_not_found"
        ? 404
        : result.error === "share_revoked_or_expired"
          ? 410
          : result.error === "not_share_recipient"
            ? 404
            : result.error === "already_imported"
              ? 409
              : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(
    {
      newVaultEntryId: result.newVaultEntryId,
      sourceEntryId: result.sourceEntryId,
      sharerUserId: result.sharerUserId,
    },
    { status: 201 },
  );
}
