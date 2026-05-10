// POST /api/admin/plot-claims/[claimId]/verify
//
// Spec §7.5 + §10. Admin verifies a non-OWNER PlotClaim (BROKER /
// DEVELOPER / ARCHITECT / POA). OWNER claims go through
// /api/admin/title-deeds/[parcelId]/verify which has additional
// verifiedOwnerUserId side effects.
//
// Body: {} (no body required)
// Auth: getAdminUserId.

import { NextRequest, NextResponse } from "next/server";
import { ClaimStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { sendTelegramToAdmins } from "@/lib/telegram";
import { claimVerified } from "@/lib/email-templates/claim-verified";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

const NON_OWNER_VERIFIABLE: UserRole[] = [
  UserRole.BROKER,
  UserRole.DEVELOPER,
  UserRole.ARCHITECT,
  UserRole.POA,
];

const ROLE_LABEL: Partial<Record<UserRole, string>> = {
  BROKER: "Broker",
  DEVELOPER: "Developer",
  ARCHITECT: "Architect",
  POA: "Power of Attorney",
};

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function publicOrigin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.zaahi.io";
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ claimId: string }> },
) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return jsonError(403, "forbidden", "Admin required.");

  const { claimId } = await ctx.params;

  const claim = await prisma.plotClaim.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      parcelId: true,
      userId: true,
      roleAtClaim: true,
      status: true,
      user: { select: { id: true, nickname: true, email: true } },
      parcel: { select: { id: true, plotNumber: true, district: true } },
    },
  });
  if (!claim) return jsonError(404, "claim_not_found", "Claim not found.");
  if (claim.status !== ClaimStatus.PENDING) {
    return jsonError(409, "wrong_status", `Cannot verify claim from status ${claim.status}.`);
  }
  if (!NON_OWNER_VERIFIABLE.includes(claim.roleAtClaim)) {
    return jsonError(
      400,
      "wrong_role",
      "OWNER claims must be verified through /api/admin/title-deeds/[parcelId]/verify.",
    );
  }

  const now = new Date();
  await prisma.plotClaim.update({
    where: { id: claim.id },
    data: {
      status: ClaimStatus.VERIFIED,
      verifiedAt: now,
      verifiedById: adminId,
    },
  });

  // ── Notifications ────────────────────────────────────────────────
  const parcelLink = `${publicOrigin(req)}/parcels/${claim.parcelId}`;
  const claimantNickname = claim.user.nickname ?? "claimant";
  const roleLabel = ROLE_LABEL[claim.roleAtClaim] ?? claim.roleAtClaim;
  if (claim.user.email) {
    const tpl = claimVerified({
      nickname: claimantNickname,
      roleLabel,
      plotNumber: claim.parcel.plotNumber,
      district: claim.parcel.district,
      parcelLink,
    });
    void sendEmail({ to: claim.user.email, subject: tpl.subject, html: tpl.html });
  }

  void logActivity({
    userId: claim.userId,
    kind: "CLAIM_VERIFIED",
    ref: claim.parcelId,
    payload: {
      claimId: claim.id,
      role: claim.roleAtClaim,
      parcelId: claim.parcelId,
      verifiedById: adminId,
    },
  });

  void sendTelegramToAdmins({
    text: `✅ ${roleLabel} claim verified — Plot ${claim.parcel.plotNumber} (${claimantNickname})`,
    parseMode: "HTML",
    disablePreview: true,
  });

  return NextResponse.json({
    ok: true,
    claimId: claim.id,
    status: ClaimStatus.VERIFIED,
    verifiedAt: now.toISOString(),
  });
}
