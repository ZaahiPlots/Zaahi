// POST /api/admin/plot-claims/[claimId]/reject
//
// Reject a PENDING non-OWNER PlotClaim with a reason. claim.status →
// REJECTED + rejectionReason. Email claim-rejected to the claimant.
//
// Body: { reason: string (1..500) }
// Auth: getAdminUserId.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ClaimStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { sendTelegramToAdmins } from "@/lib/telegram";
import { claimRejected } from "@/lib/email-templates/claim-rejected";
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

const RejectBodySchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ claimId: string }> },
) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return jsonError(403, "forbidden", "Admin required.");

  const { claimId } = await ctx.params;

  let body: z.infer<typeof RejectBodySchema>;
  try {
    const raw = await req.json();
    const parsed = RejectBodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(400, "validation_failed", "Body validation failed.", {
        issues: parsed.error.issues,
      });
    }
    body = parsed.data;
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON body.");
  }

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
    return jsonError(409, "wrong_status", `Cannot reject claim from status ${claim.status}.`);
  }
  if (!NON_OWNER_VERIFIABLE.includes(claim.roleAtClaim)) {
    return jsonError(
      400,
      "wrong_role",
      "OWNER claims must be rejected through /api/admin/title-deeds/[parcelId]/reject.",
    );
  }

  const now = new Date();
  await prisma.plotClaim.update({
    where: { id: claim.id },
    data: {
      status: ClaimStatus.REJECTED,
      verifiedById: adminId, // actor on the action
      verifiedAt: now,
      rejectionReason: body.reason,
    },
  });

  const claimantNickname = claim.user.nickname ?? "claimant";
  const roleLabel = ROLE_LABEL[claim.roleAtClaim] ?? claim.roleAtClaim;
  if (claim.user.email) {
    const tpl = claimRejected({
      nickname: claimantNickname,
      roleLabel,
      plotNumber: claim.parcel.plotNumber,
      district: claim.parcel.district,
      reason: body.reason,
    });
    void sendEmail({ to: claim.user.email, subject: tpl.subject, html: tpl.html });
  }

  void logActivity({
    userId: claim.userId,
    kind: "CLAIM_REJECTED",
    ref: claim.parcelId,
    payload: {
      claimId: claim.id,
      role: claim.roleAtClaim,
      parcelId: claim.parcelId,
      reason: body.reason,
      verifiedById: adminId,
    },
  });

  void sendTelegramToAdmins({
    text: `❌ ${roleLabel} claim rejected — Plot ${claim.parcel.plotNumber} (${claimantNickname})`,
    parseMode: "HTML",
    disablePreview: true,
  });

  return NextResponse.json({
    ok: true,
    claimId: claim.id,
    status: ClaimStatus.REJECTED,
    rejectedAt: now.toISOString(),
  });
}
