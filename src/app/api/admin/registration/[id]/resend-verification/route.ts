// POST /api/admin/registration/[id]/resend-verification
//
// Spec §6.5: optional helper to re-send the email-verification link
// when the original one expired (Supabase TTL ~24h).
//
// Generates a fresh signup link via supabase.auth.admin.generateLink
// and emails it through Resend with the registration-received template
// so the brand experience matches the first email.
//
// Auth: admin only.
// No state changes — application stays in its current status.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email";
import { registrationReceived } from "@/lib/email-templates/registration-received";
import { ROLE_LABELS, type CohortApplicantRole } from "@/lib/registration-validation";

export const runtime = "nodejs";

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
  ctx: { params: Promise<{ id: string }> },
) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return jsonError(403, "forbidden", "Admin required.");

  const { id } = await ctx.params;
  const row = await prisma.registrationApplication.findUnique({ where: { id } });
  if (!row) return jsonError(404, "not_found", "Application not found.");
  if (!isSupabaseAdminAvailable()) {
    return jsonError(503, "service_unavailable", "Service-role unavailable.");
  }
  const admin = getSupabaseAdmin()!;

  let actionLink = `${publicOrigin(req)}/`;
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink", // recoverable: magiclink works even if email already confirmed
      email: row.email,
      options: { redirectTo: `${publicOrigin(req)}/` },
    });
    if (error || !data?.properties?.action_link) {
      console.error("[resend-verification] generateLink failed:", error?.message);
      return jsonError(500, "link_generation_failed", "Could not generate a fresh verification link.");
    }
    actionLink = data.properties.action_link;
  } catch (e) {
    console.error("[resend-verification] generateLink threw:", e);
    return jsonError(500, "link_generation_failed", "Could not generate a fresh verification link.");
  }

  const roleLabel = row.roleApplied
    ? ROLE_LABELS[row.roleApplied as CohortApplicantRole] ?? row.roleApplied
    : "applicant";
  const tpl = registrationReceived({
    nickname: row.nickname,
    role: roleLabel,
    applicationId: id,
    verificationLink: actionLink,
    expectedSlaDays: 3,
  });
  const result = await sendEmail({ to: row.email, subject: tpl.subject, html: tpl.html });

  return NextResponse.json({
    ok: true,
    applicationId: id,
    emailDispatched: "ok" in result && result.ok,
  });
}
