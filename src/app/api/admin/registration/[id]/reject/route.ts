// POST /api/admin/registration/[id]/reject  — admin rejects an application.
//
// Spec §7.4 reject action.
//
// Body: { reason: string (required, 1..500) }
//
// Pre-conditions:
//   - application status is PENDING_REVIEW or WAITLIST
//
// Side effects:
//   1. Update RegistrationApplication.status='REJECTED' + rejectedById
//      + rejectedAt + rejectionReason.
//   2. Send registration-rejected email (best-effort).
//   3. Telegram fan-out (best-effort).
//
// Does NOT:
//   - delete or ban the Supabase Auth user (they stay un-approved).
//   - create a User row.
//   - touch Supabase Auth user_metadata (approved stays false).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { sendTelegramToAdmins } from "@/lib/telegram";
import { registrationRejected } from "@/lib/email-templates/registration-rejected";
import { ROLE_LABELS, type CohortApplicantRole } from "@/lib/registration-validation";

export const runtime = "nodejs";

const RejectBodySchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return jsonError(403, "forbidden", "Admin required.");

  const { id } = await ctx.params;
  const row = await prisma.registrationApplication.findUnique({ where: { id } });
  if (!row) return jsonError(404, "not_found", "Application not found.");
  if (row.status !== "PENDING_REVIEW" && row.status !== "WAITLIST") {
    return jsonError(409, "wrong_status", `Cannot reject from status ${row.status}.`);
  }
  if (row.autoMigrated) {
    return jsonError(409, "auto_migrated", "Auto-migrated rows cannot be rejected.");
  }

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

  const now = new Date();
  await prisma.registrationApplication.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectedById: adminId,
      rejectedAt: now,
      rejectionReason: body.reason,
    },
  });

  const roleLabel = row.roleApplied
    ? ROLE_LABELS[row.roleApplied as CohortApplicantRole] ?? row.roleApplied
    : "applicant";
  const tpl = registrationRejected({
    nickname: row.nickname,
    role: roleLabel,
    reason: body.reason,
  });
  void sendEmail({ to: row.email, subject: tpl.subject, html: tpl.html });

  void sendTelegramToAdmins({
    text: `❌ Rejected ${(roleLabel as string).split(" — ")[0]} application from ${row.nickname} (${id.slice(0, 8)}…)`,
    parseMode: "HTML",
    disablePreview: true,
  });

  return NextResponse.json({
    ok: true,
    applicationId: id,
    status: "REJECTED",
    rejectedAt: now.toISOString(),
  });
}
