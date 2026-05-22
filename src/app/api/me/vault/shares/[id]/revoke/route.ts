// ZAAHI Vault — share revoke (owner-scoped).
//
// POST /api/me/vault/shares/[id]/revoke  body: { reason?: string }
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.1.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { revokeShare } from "@/lib/vault-share";

export const runtime = "nodejs";

const RevokeBody = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const raw = await req.json().catch(() => ({}));
  const parsed = RevokeBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }

  // Ownership gate — the share's ownerId must match the caller.
  const share = await prisma.vaultShare.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!share || share.ownerId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = await revokeShare({
    shareId: id,
    ownerId: userId,
    reason: parsed.data.reason ?? null,
  });

  if ("error" in result) {
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "already_revoked"
          ? 409
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    revokedAt: result.revokedAt,
    vaultEntryId: result.vaultEntryId,
  });
}
