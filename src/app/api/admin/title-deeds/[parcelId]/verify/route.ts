// POST /api/admin/title-deeds/[parcelId]/verify
//
// Spec §7.5 + §10 + §11.3 (CORR-2). Admin verifies one OWNER PlotClaim
// on a parcel and assigns ownership.
//
// Body: { claimId: string }
//
// Pre-conditions:
//   - parcel.verifiedOwnerUserId IS NULL (single-verified-owner
//     invariant per spec §5.5; if already set, 409).
//   - claim exists, belongs to this parcel, roleAtClaim=OWNER,
//     status=PENDING.
//
// Side effects (transactional in the DB part):
//   1. Parcel.verifiedOwnerUserId = claim.userId
//      Parcel.verifiedAt = now
//      Parcel.verifiedById = adminId
//   2. Claim.status = VERIFIED
//      Claim.verifiedAt = now
//      Claim.verifiedById = adminId
//
// Side effects (best-effort, post-transaction):
//   3. Email title-deed-verified to the claimant.
//   4. If parcel.ownerId !== claim.userId → email
//      ownership-transferred-notice to parcel.owner (creator). CORR-2.
//   5. ActivityLog OWNER_VERIFIED.
//   6. Telegram fan-out to admins.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ClaimStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { sendTelegramToAdmins } from "@/lib/telegram";
import { titleDeedVerified } from "@/lib/email-templates/title-deed-verified";
import { ownershipTransferredNotice } from "@/lib/email-templates/ownership-transferred-notice";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

const VerifyBodySchema = z.object({
  claimId: z.string().min(1),
});

function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

function publicOrigin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.zaahi.io";
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ parcelId: string }> },
) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return jsonError(403, "forbidden", "Admin required.");

  const { parcelId } = await ctx.params;

  let body: z.infer<typeof VerifyBodySchema>;
  try {
    const raw = await req.json();
    const parsed = VerifyBodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(400, "validation_failed", "Body validation failed.", {
        issues: parsed.error.issues,
      });
    }
    body = parsed.data;
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON body.");
  }

  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    select: {
      id: true,
      plotNumber: true,
      district: true,
      ownerId: true,
      verifiedOwnerUserId: true,
      owner: { select: { id: true, nickname: true, email: true } },
    },
  });
  if (!parcel) return jsonError(404, "parcel_not_found", "Parcel not found.");
  if (parcel.verifiedOwnerUserId) {
    return jsonError(
      409,
      "already_verified",
      "This parcel already has a verified owner. Verify another OWNER claim only after the existing one is cleared.",
    );
  }

  const claim = await prisma.plotClaim.findUnique({
    where: { id: body.claimId },
    select: {
      id: true,
      parcelId: true,
      userId: true,
      roleAtClaim: true,
      status: true,
      user: { select: { id: true, nickname: true, email: true } },
    },
  });
  if (!claim) return jsonError(404, "claim_not_found", "Claim not found.");
  if (claim.parcelId !== parcelId) {
    return jsonError(400, "claim_parcel_mismatch", "Claim does not belong to this parcel.");
  }
  if (claim.roleAtClaim !== UserRole.OWNER) {
    return jsonError(400, "wrong_role", "Title Deed verification only applies to OWNER claims.");
  }
  if (claim.status !== ClaimStatus.PENDING) {
    return jsonError(409, "wrong_status", `Cannot verify claim from status ${claim.status}.`);
  }

  // ── Transactional DB writes ──────────────────────────────────────
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.parcel.update({
      where: { id: parcelId },
      data: {
        verifiedOwnerUserId: claim.userId,
        verifiedAt: now,
        verifiedById: adminId,
      },
    });
    await tx.plotClaim.update({
      where: { id: claim.id },
      data: {
        status: ClaimStatus.VERIFIED,
        verifiedAt: now,
        verifiedById: adminId,
      },
    });
  });

  // ── Notifications ────────────────────────────────────────────────
  const parcelLink = `${publicOrigin(req)}/parcels/${parcelId}`;
  const claimantNickname = claim.user.nickname ?? "claimant";

  const verifiedTpl = titleDeedVerified({
    nickname: claimantNickname,
    plotNumber: parcel.plotNumber,
    district: parcel.district,
    parcelLink,
  });
  if (claim.user.email) {
    void sendEmail({ to: claim.user.email, subject: verifiedTpl.subject, html: verifiedTpl.html });
  }

  // CORR-2 / R15 — if the verified owner differs from the creator,
  // send the creator an informational notice. Skip when creator is the
  // system user (autoMigrated row, no real recipient) or when there is
  // no email on the creator row.
  const SYSTEM_USER_ID = "00000000-0000-0000-0000-00000000zaah";
  const creatorIsDifferent = parcel.ownerId !== claim.userId;
  if (
    creatorIsDifferent &&
    parcel.owner &&
    parcel.owner.id !== SYSTEM_USER_ID &&
    parcel.owner.email
  ) {
    // The creator's roleAtClaim on this parcel — pull the most-recent
    // non-REJECTED claim row. Falls back to "creator" if none.
    const creatorClaim = await prisma.plotClaim.findFirst({
      where: {
        parcelId,
        userId: parcel.owner.id,
        status: { not: ClaimStatus.REJECTED },
      },
      orderBy: { createdAt: "desc" },
      select: { roleAtClaim: true },
    });
    const noticeTpl = ownershipTransferredNotice({
      creatorNickname: parcel.owner.nickname ?? "creator",
      verifiedNickname: claimantNickname,
      creatorRoleAtClaim: creatorClaim?.roleAtClaim ?? "creator",
      plotNumber: parcel.plotNumber,
      district: parcel.district,
      parcelLink,
    });
    void sendEmail({
      to: parcel.owner.email,
      subject: noticeTpl.subject,
      html: noticeTpl.html,
    });
  }

  // Activity log — populates BOTH userIds per spec §5.4.1 row 5.
  void logActivity({
    userId: claim.userId,
    kind: "OWNER_VERIFIED",
    ref: parcelId,
    payload: {
      claimId: claim.id,
      parcelId,
      plotNumber: parcel.plotNumber,
      verifiedById: adminId,
      creatorIsDifferent,
      creatorUserId: parcel.ownerId,
    },
  });

  void sendTelegramToAdmins({
    text:
      `🔓 Title Deed verified — Plot ${parcel.plotNumber} → ${claimantNickname}` +
      (creatorIsDifferent
        ? ` (creator ${parcel.owner?.nickname ?? "—"} notified)`
        : ""),
    parseMode: "HTML",
    disablePreview: true,
  });

  return NextResponse.json({
    ok: true,
    parcelId,
    claimId: claim.id,
    verifiedOwnerUserId: claim.userId,
    verifiedAt: now.toISOString(),
    creatorIsDifferent,
  });
}
