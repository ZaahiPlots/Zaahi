// ZAAHI Vault — share creation + list (owner-scoped).
//
// POST /api/me/vault/entries/[id]/shares  body: VaultShareCreate
// GET  /api/me/vault/entries/[id]/shares
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §5.1, §6.4.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { createShare, type RecipientLookup } from "@/lib/vault-share";

export const runtime = "nodejs";

const VaultShareCreateSchema = z.object({
  recipientLookup: z.union([
    z.object({ email: z.string().email() }).strict(),
    z.object({ nickname: z.string().trim().min(1).max(64) }).strict(),
    z.object({ userId: z.string().cuid() }).strict(),
  ]),
  // VIEW (default) or FEASIBILITY. FEASIBILITY = VIEW + read-only access to
  // the saved feasibility studies attached to this entry (feasibility v6.1,
  // 2026-11-20 — docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md; the
  // gate is resolveStudyAccess in src/lib/feasibility-v6/studyRules.ts).
  // Omitting the field still yields VIEW, so existing clients are unaffected.
  // OFFER stays un-grantable here until Phase 2.2 ships its own behaviour.
  permission: z.enum(["VIEW", "FEASIBILITY"]).default("VIEW"),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = VaultShareCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }

  // Ownership gate — fail with 404 (not 403) per the spec pattern.
  const entry = await prisma.vaultEntry.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!entry || entry.ownerId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = await createShare({
    vaultEntryId: id,
    ownerId: userId,
    recipientLookup: parsed.data.recipientLookup as RecipientLookup,
    permission: parsed.data.permission,
    expiresAt: parsed.data.expiresAt ?? null,
  });

  if ("error" in result) {
    const status =
      result.error === "cannot_share_with_self"
        ? 400
        : result.error === "recipient_not_found"
          ? 404
          : result.error === "entry_not_found"
            ? 404
            : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(
    {
      share: result.share,
      recipient: result.recipient,
    },
    { status: 201 },
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const entry = await prisma.vaultEntry.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!entry || entry.ownerId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const shares = await prisma.vaultShare.findMany({
    where: { vaultEntryId: id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      recipientUserId: true,
      recipient: { select: { id: true, nickname: true } },
      permission: true,
      expiresAt: true,
      createdAt: true,
      lastViewedAt: true,
    },
  });

  return NextResponse.json({
    items: shares.map((s) => ({
      id: s.id,
      recipient: s.recipient,
      permission: s.permission,
      expiresAt: s.expiresAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      lastViewedAt: s.lastViewedAt?.toISOString() ?? null,
    })),
  });
}
