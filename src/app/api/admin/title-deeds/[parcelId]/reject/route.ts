// POST /api/admin/title-deeds/[parcelId]/reject
//
// Reject one OWNER PlotClaim. Parcel.verifiedOwnerUserId stays NULL
// — only the claim is marked REJECTED. The user gets a claim-rejected
// email with the reason; their account is unaffected and they can
// re-submit a corrected claim.
//
// Body: { claimId: string, reason: string (1..500) }
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

const RejectBodySchema = z.object({
  claimId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
});

function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ parcelId: string }> },
) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return jsonError(403, "forbidden", "Admin required.");

  const { parcelId } = await ctx.params;

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
    where: { id: body.claimId },
    select: {
      id: true,
      parcelId: true,
      roleAtClaim: true,
      status: true,
      userId: true,
      user: { select: { id: true, nickname: true, email: true } },
      parcel: { select: { id: true, plotNumber: true, district: true } },
    },
  });
  if (!claim) return jsonError(404, "claim_not_found", "Claim not found.");
  if (claim.parcelId !== parcelId) {
    return jsonError(400, "claim_parcel_mismatch", "Claim does not belong to this parcel.");
  }
  if (claim.roleAtClaim !== UserRole.OWNER) {
    return jsonError(400, "wrong_role", "Title Deed reject only applies to OWNER claims.");
  }
  if (claim.status !== ClaimStatus.PENDING) {
    return jsonError(409, "wrong_status", `Cannot reject claim from status ${claim.status}.`);
  }

  const now = new Date();
  await prisma.plotClaim.update({
    where: { id: claim.id },
    data: {
      status: ClaimStatus.REJECTED,
      verifiedById: adminId, // re-purposed as the actor on the action
      verifiedAt: now,
      rejectionReason: body.reason,
    },
  });

  const claimantNickname = claim.user.nickname ?? "claimant";
  if (claim.user.email) {
    const tpl = claimRejected({
      nickname: claimantNickname,
      roleLabel: "Owner",
      plotNumber: claim.parcel.plotNumber,
      district: claim.parcel.district,
      reason: body.reason,
    });
    void sendEmail({ to: claim.user.email, subject: tpl.subject, html: tpl.html });
  }

  void logActivity({
    userId: claim.userId,
    kind: "CLAIM_REJECTED",
    ref: parcelId,
    payload: {
      claimId: claim.id,
      role: "OWNER",
      parcelId,
      reason: body.reason,
      verifiedById: adminId,
    },
  });

  void sendTelegramToAdmins({
    text: `❌ Title Deed claim rejected — Plot ${claim.parcel.plotNumber} (${claimantNickname})`,
    parseMode: "HTML",
    disablePreview: true,
  });

  return NextResponse.json({
    ok: true,
    parcelId,
    claimId: claim.id,
    status: ClaimStatus.REJECTED,
    rejectedAt: now.toISOString(),
  });
}
