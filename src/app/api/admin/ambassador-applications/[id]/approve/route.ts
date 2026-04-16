// ── Admin: approve ambassador application ───────────────────────────
// POST /api/admin/ambassador-applications/:id/approve
//
// Flow:
//   1. Auth via getAdminUserId()
//   2. Load application; 409 if status !== "PENDING" (idempotency guard)
//   3. Generate unique referralCode (retry on @unique collision, max 3)
//   4. Update application → status=APPROVED, approvedAt/By, referralCode
//   5. Fire-and-forget approval email to applicant + Telegram to admins
//   6. Respond with { success, referralCode, emailSent, telegramSent }
//
// Notes:
//   - We do NOT touch the User row here. The applicant may not have an
//     account yet. Linkage happens in /api/users/sync when they first
//     sign in with the matching email (APPROVED → ACTIVE state move).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { generateReferralCode, type AmbassadorPlan } from "@/lib/ambassador";
import { sendEmail } from "@/lib/email";
import { sendTelegramMessage, escapeMarkdownV2 } from "@/lib/telegram";
import { renderApplicationApprovedEmail } from "@/lib/email-templates/application-approved";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const MAX_CODE_ATTEMPTS = 3;

export async function POST(req: NextRequest, { params }: Ctx) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const app = await prisma.ambassadorApplication.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (app.status !== "PENDING") {
    return NextResponse.json(
      { error: "not_pending", currentStatus: app.status },
      { status: 409 },
    );
  }

  let referralCode: string | null = null;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const candidate = generateReferralCode();
    try {
      await prisma.ambassadorApplication.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy: adminId,
          referralCode: candidate,
        },
      });
      referralCode = candidate;
      break;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === "P2002") {
        lastErr = e;
        continue; // unique collision on referralCode — try again
      }
      throw e;
    }
  }
  if (!referralCode) {
    console.error("[admin/approve] referral-code collision after retries:", lastErr);
    return NextResponse.json(
      { error: "referral_code_collision" },
      { status: 500 },
    );
  }

  // Fire-and-forget notifications. Never blocks response.
  const [emailResult, telegramResult] = await Promise.all([
    (async () => {
      const mail = renderApplicationApprovedEmail({
        name: app.name,
        plan: app.plan as AmbassadorPlan,
        referralCode: referralCode!,
      });
      return sendEmail({
        to: app.email,
        subject: mail.subject,
        html: mail.html,
      });
    })(),
    (async () => {
      const base = process.env.NEXT_PUBLIC_BASE_URL || "https://zaahi.io";
      const e = escapeMarkdownV2;
      const text = [
        `*Ambassador APPROVED*`,
        ``,
        `${e("Plan:")} *${e(app.plan)}*`,
        `${e("Name:")} ${e(app.name)}`,
        `${e("Email:")} ${e(app.email)}`,
        `${e("Code:")} \`${e(referralCode!)}\``,
      ].join("\n");
      return sendTelegramMessage({
        text,
        parseMode: "MarkdownV2",
        inlineKeyboard: [
          [{ text: "Open admin panel", url: `${base}/admin/ambassadors#${app.id}` }],
        ],
      });
    })(),
  ]);

  const emailSent = "ok" in emailResult && emailResult.ok === true;
  const telegramSent = "ok" in telegramResult && telegramResult.ok === true;

  return NextResponse.json({
    success: true,
    referralCode,
    emailSent,
    telegramSent,
  });
}
