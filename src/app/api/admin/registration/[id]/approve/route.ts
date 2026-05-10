// POST /api/admin/registration/[id]/approve  — admin approves an application.
//
// Spec §7.4 approve action + GAP-1 (email-verified gate) + recovery
// link generation per §7.4 step 4.
//
// Body: { realName: string (required, 2..100), confirmExceedsCap?: boolean }
//
// Required to fill User.name. Spec §5.2 keeps `User.name` as the
// real-name-from-KYC; cohort form (Step 6) doesn't capture name —
// admin reads it from the uploaded ID and types it here. Single
// source of truth.
//
// Pre-conditions:
//   - application status is PENDING_REVIEW or WAITLIST
//   - email_confirmed_at IS NOT NULL (server-side recheck of GAP-1)
//   - if status was WAITLIST and cap is now exceeded post-approve,
//     body.confirmExceedsCap must be true
//
// Side effects (in order, with rollback notes):
//   1. Update RegistrationApplication.status='APPROVED' + approvedById
//      + approvedAt.
//   2. Upsert User row with id=row.userId, role=row.roleApplied,
//      nickname=row.nickname, name=body.realName, email=row.email.
//   3. supabase.auth.admin.updateUserById(userId, { user_metadata:
//      { approved: true, role, nickname } }).
//   4. Generate recovery link.
//   5. Send registration-approved email.
//   6. Create in-app Notification.
//   7. Telegram fan-out to admins (informational only).
//
// Steps 5-7 are best-effort — failures don't roll back the DB write.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase-admin";
import { CAP_PER_ROLE, countApprovedForRole } from "@/lib/registration-cap";
import { sendEmail } from "@/lib/email";
import { sendTelegramToAdmins } from "@/lib/telegram";
import { registrationApproved } from "@/lib/email-templates/registration-approved";
import { ROLE_LABELS, type CohortApplicantRole } from "@/lib/registration-validation";

export const runtime = "nodejs";

const ApproveBodySchema = z.object({
  realName: z.string().trim().min(2).max(100),
  confirmExceedsCap: z.boolean().optional(),
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
  ctx: { params: Promise<{ id: string }> },
) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return jsonError(403, "forbidden", "Admin required.");

  const { id } = await ctx.params;
  const row = await prisma.registrationApplication.findUnique({ where: { id } });
  if (!row) return jsonError(404, "not_found", "Application not found.");
  if (row.status !== "PENDING_REVIEW" && row.status !== "WAITLIST") {
    return jsonError(409, "wrong_status", `Cannot approve from status ${row.status}.`);
  }
  if (row.autoMigrated) {
    return jsonError(409, "auto_migrated", "Auto-migrated rows are already approved.");
  }
  if (!row.userId || !row.roleApplied) {
    return jsonError(409, "missing_fields", "Application is missing userId or roleApplied.");
  }

  let body: z.infer<typeof ApproveBodySchema>;
  try {
    const raw = await req.json();
    const parsed = ApproveBodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(400, "validation_failed", "Body validation failed.", {
        issues: parsed.error.issues,
      });
    }
    body = parsed.data;
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON body.");
  }

  // ── Service-role availability ─────────────────────────────────────
  if (!isSupabaseAdminAvailable()) {
    return jsonError(
      503,
      "service_unavailable",
      "Approve flow requires the service-role key. Try again shortly.",
    );
  }
  const admin = getSupabaseAdmin()!;

  // ── GAP-1: email must be verified ────────────────────────────────
  let emailConfirmedAt: string | null = null;
  try {
    const { data, error } = await admin.auth.admin.getUserById(row.userId);
    if (error || !data?.user) {
      return jsonError(409, "auth_user_missing", "Supabase Auth user not found — re-create application.");
    }
    emailConfirmedAt = data.user.email_confirmed_at ?? null;
  } catch (e) {
    console.error("[admin/approve] getUserById threw:", e);
    return jsonError(500, "auth_lookup_failed", "Could not check email verification status.");
  }
  if (!emailConfirmedAt) {
    return jsonError(
      409,
      "email_not_verified",
      "User has not verified their email yet. Resend the verification email and ask them to click the link.",
    );
  }

  // ── Cap re-check ─────────────────────────────────────────────────
  // If approving from WAITLIST: confirm with admin via body flag when
  // we'd push the cap over.
  const currentApproved = await countApprovedForRole(prisma, row.roleApplied);
  const wouldExceed = currentApproved >= CAP_PER_ROLE;
  if (row.status === "WAITLIST" && wouldExceed && !body.confirmExceedsCap) {
    return jsonError(
      409,
      "cap_exceeded_unconfirmed",
      `Approving will push ${row.roleApplied} to ${currentApproved + 1}/${CAP_PER_ROLE}. Re-send with confirmExceedsCap=true to proceed.`,
      { currentApproved, cap: CAP_PER_ROLE, role: row.roleApplied },
    );
  }

  // ── DB writes (transactional) ────────────────────────────────────
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.registrationApplication.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: adminId,
        approvedAt: now,
      },
    });
    await tx.user.upsert({
      where: { id: row.userId! },
      create: {
        id: row.userId!,
        email: row.email,
        role: row.roleApplied!,
        name: body.realName,
        nickname: row.nickname,
      },
      update: {
        email: row.email,
        role: row.roleApplied!,
        name: body.realName,
        nickname: row.nickname,
      },
    });
  });

  // ── Supabase Auth: flip approved=true ────────────────────────────
  try {
    await admin.auth.admin.updateUserById(row.userId, {
      user_metadata: {
        approved: true,
        role: row.roleApplied,
        nickname: row.nickname,
      },
    });
  } catch (e) {
    console.error("[admin/approve] updateUser approved flip failed:", e);
    // Don't roll back — the DB is the source of truth and admin can
    // re-flip via Supabase Dashboard if this somehow fails.
  }

  // ── Generate recovery link for the email CTA ─────────────────────
  let recoveryLink = `${publicOrigin(req)}/reset-password`;
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: row.email,
      options: { redirectTo: `${publicOrigin(req)}/reset-password` },
    });
    if (!error && data?.properties?.action_link) {
      recoveryLink = data.properties.action_link;
    }
  } catch (e) {
    console.warn("[admin/approve] generateLink threw:", e);
  }

  // ── Notifications (best-effort) ──────────────────────────────────
  const roleLabel = ROLE_LABELS[row.roleApplied as CohortApplicantRole] ?? row.roleApplied;
  const tpl = registrationApproved({
    nickname: row.nickname,
    role: roleLabel,
    recoveryLink,
  });
  void sendEmail({ to: row.email, subject: tpl.subject, html: tpl.html });

  void prisma.notification
    .create({
      data: {
        userId: row.userId,
        kind: "REGISTRATION_APPROVED",
        payload: {
          applicationId: id,
          role: row.roleApplied,
          nickname: row.nickname,
          approvedAt: now.toISOString(),
        },
      },
    })
    .catch((e) => console.warn("[admin/approve] Notification.create failed:", e));

  void sendTelegramToAdmins({
    text: `✅ Approved ${roleLabel.split(" — ")[0]} application from ${row.nickname} (${id.slice(0, 8)}…)`,
    parseMode: "HTML",
    disablePreview: true,
  });

  return NextResponse.json({
    ok: true,
    applicationId: id,
    status: "APPROVED",
    nickname: row.nickname,
    approvedAt: now.toISOString(),
  });
}
