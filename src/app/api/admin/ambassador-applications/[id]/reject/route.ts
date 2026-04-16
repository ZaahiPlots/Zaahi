// ── Admin: reject ambassador application ────────────────────────────
// POST /api/admin/ambassador-applications/:id/reject
// Body: { reasonType: string, reasonText: string }
//
// Flow:
//   1. Auth via getAdminUserId()
//   2. Validate body — reasonText required (≤ 2000 chars)
//   3. 409 if status !== "PENDING"
//   4. Update app → status=REJECTED, rejectedAt/By, rejectionReason
//   5. Fire rejection email + Telegram (non-blocking)
//   6. Respond with { success, emailSent, telegramSent }
//
// reasonType (UI dropdown) values expected:
//   "Invalid transaction" | "Duplicate application" |
//   "Insufficient information" | "Does not meet criteria" | "Other"
// reasonText: the user-visible explanation shown in the email.
//   For dropdown-only choices it may equal reasonType; for "Other" the
//   UI requires a free-text message.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import type { AmbassadorPlan } from "@/lib/ambassador";
import { sendEmail } from "@/lib/email";
import { sendTelegramMessage, escapeMarkdownV2 } from "@/lib/telegram";
import { renderApplicationRejectedEmail } from "@/lib/email-templates/application-rejected";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const RejectSchema = z.object({
  reasonType: z.string().trim().min(1).max(120),
  reasonText: z.string().trim().min(1).max(2000),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  let parsed;
  try {
    parsed = RejectSchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }
  const { reasonType, reasonText } = parsed.data;

  const app = await prisma.ambassadorApplication.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (app.status !== "PENDING") {
    return NextResponse.json(
      { error: "not_pending", currentStatus: app.status },
      { status: 409 },
    );
  }

  // Store the composite reason: "type: text" so admin can filter later.
  const storedReason = reasonType === reasonText ? reasonType : `${reasonType}: ${reasonText}`;

  await prisma.ambassadorApplication.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectedBy: adminId,
      rejectionReason: storedReason,
    },
  });

  const [emailResult, telegramResult] = await Promise.all([
    (async () => {
      const mail = renderApplicationRejectedEmail({
        name: app.name,
        plan: app.plan as AmbassadorPlan,
        reason: reasonText, // user-facing reason, without type prefix
      });
      return sendEmail({
        to: app.email,
        subject: mail.subject,
        html: mail.html,
      });
    })(),
    (async () => {
      const e = escapeMarkdownV2;
      const text = [
        `*Ambassador REJECTED*`,
        ``,
        `${e("Plan:")} *${e(app.plan)}*`,
        `${e("Name:")} ${e(app.name)}`,
        `${e("Email:")} ${e(app.email)}`,
        `${e("Reason:")} ${e(storedReason)}`,
      ].join("\n");
      return sendTelegramMessage({ text, parseMode: "MarkdownV2" });
    })(),
  ]);

  const emailSent = "ok" in emailResult && emailResult.ok === true;
  const telegramSent = "ok" in telegramResult && telegramResult.ok === true;

  return NextResponse.json({ success: true, emailSent, telegramSent });
}
