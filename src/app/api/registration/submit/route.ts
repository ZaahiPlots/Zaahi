// POST /api/registration/submit  — public, anonymous, multipart/form-data.
//
// Spec source: spec-05 §6.4 (full server flow), §11.3 (email templates),
// §12.5 (PDPL serialization), GAP-1 / GAP-3 resolutions.
//
// Multipart shape:
//   text  field "data"          — JSON string matching SubmitTextSchema
//   file  fields "file_<kind>_<index>"  — one entry per uploaded file,
//                                         multiple per kind allowed
//
// Order of operations (deliberate; rollback notes inline):
//   1. Parse multipart, Zod-validate text body, validate doc requirements
//      against the file parts. NO side effects yet.
//   2. Email + nickname dedup checks (spec GAP-3). Surface 4xx codes.
//   3. Cap check — count APPROVED applications for the role; pick
//      PENDING_REVIEW or WAITLIST.
//   4. Service-role availability check. Return 503 if SUPABASE_SERVICE_ROLE_KEY
//      is not set so the rest of the flow doesn't half-execute.
//   5. supabase.auth.admin.createUser — POINT OF NO RETURN (auth-side
//      state). On any later error we attempt deleteUser as a rollback.
//   6. Upload all files to <userId>/<kind>-<ts>-<sanitized>.<ext>.
//      Partial upload failure → rollback createUser, return 500.
//   7. supabase.auth.admin.generateLink type=signup → action_link for
//      the verification email.
//   8. prisma.registrationApplication.create with full documentsJson.
//      Failure here → rollback createUser + uploaded files, return 500.
//   9. Send emails (applicant + admins) and Telegram (admins) — silent
//      failures OK; the row is committed and admin can resend later.
//  10. Return { applicationId, status, expectedReviewByDate, nickname }.

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase-admin";
import {
  SubmitTextSchema,
  ROLE_LABELS,
  type CohortApplicantRole,
} from "@/lib/registration-validation";
import {
  REGISTRATION_DOC_REQUIREMENTS,
  validateDocs,
  MAX_FILE_BYTES,
  ALLOWED_MIME,
  type DocKind,
} from "@/lib/registration-doc-requirements";
import { CAP_PER_ROLE, countApprovedForRole, statusForCount } from "@/lib/registration-cap";
import { sendEmail } from "@/lib/email";
import { sendTelegramToAdmins } from "@/lib/telegram";
import { registrationReceived } from "@/lib/email-templates/registration-received";
import { registrationWaitlist } from "@/lib/email-templates/registration-waitlist";
import { adminNewApplication } from "@/lib/email-templates/admin-new-application";

export const runtime = "nodejs";
// Multipart with up to ~10 MiB per file × ~10 files ≈ 100 MiB ceiling.
export const maxDuration = 60;

const BUCKET = "registration-docs";

interface UploadedDocMeta {
  kind: string;
  path: string;
  originalName: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
}

function jsonError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

function publicOrigin(req: NextRequest): string {
  // Prefer the host the request came in on (includes vercel preview
  // origins). Falls back to env URL or zaahi.io.
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.zaahi.io";
}

function sanitizeOriginalName(name: string): string {
  // Strip path separators + control chars; collapse to ASCII-safe.
  // Keep extension if present.
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  const base = name
    .slice(0, ext ? name.length - ext.length - 1 : name.length)
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  const safeExt = ext.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toLowerCase();
  if (!base) return safeExt ? `file.${safeExt}` : "file";
  return safeExt ? `${base}.${safeExt}` : base;
}

function expectedReviewByDate(): string {
  // Spec §6.4 confirmation page: 2-3 business days.
  // Approximate by adding 5 calendar days (safe lower bound for UI copy).
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 5);
  return d.toISOString();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Parse multipart ─────────────────────────────────────────────
  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    return jsonError(400, "invalid_form_data", "Could not parse multipart body.");
  }

  const dataField = form.get("data");
  if (typeof dataField !== "string") {
    return jsonError(400, "missing_data", "Missing 'data' JSON field.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(dataField);
  } catch {
    return jsonError(400, "invalid_json", "Field 'data' is not valid JSON.");
  }

  const result = SubmitTextSchema.safeParse(parsedJson);
  if (!result.success) {
    return jsonError(400, "validation_failed", "Field validation failed.", {
      issues: result.error.issues.map((i) => ({ path: i.path, message: i.message })),
    });
  }
  const body = result.data;
  const role = body.role as CohortApplicantRole;

  // ── Collect file parts: keys "file_<kind>_<index>" ────────────────
  type FilePart = { kind: DocKind; file: File };
  const fileParts: FilePart[] = [];
  for (const [key, val] of form.entries()) {
    if (!key.startsWith("file_") || !(val instanceof File)) continue;
    const m = key.match(/^file_([a-z_]+)_(\d+)$/);
    if (!m) continue;
    const kind = m[1] as DocKind;
    if (!Object.prototype.hasOwnProperty.call(REGISTRATION_DOC_REQUIREMENTS.OWNER, "kinds")) {
      // type-safety probe; never trips at runtime
    }
    fileParts.push({ kind, file: val });
  }

  // Per-file constraints (server-side enforcement; client also enforces)
  for (const p of fileParts) {
    if (p.file.size > MAX_FILE_BYTES) {
      return jsonError(400, "file_too_large", `File '${p.file.name}' exceeds 10 MiB.`);
    }
    if (!ALLOWED_MIME.has(p.file.type)) {
      return jsonError(400, "invalid_mime", `File '${p.file.name}' has unsupported type '${p.file.type}'.`);
    }
  }

  // Doc-requirement check (spec §6.4 step 3)
  const providedKinds = new Set<DocKind>(fileParts.map((p) => p.kind));
  const docCheck = validateDocs(role, providedKinds);
  if (!docCheck.ok) {
    return jsonError(400, "missing_documents", "Required documents are missing for this role.", {
      mode: docCheck.mode,
      required: docCheck.required,
      missing: docCheck.missing,
    });
  }

  // ── 2. Dedup (GAP-3) ──────────────────────────────────────────────
  const email = body.email.toLowerCase();
  const nickname = body.nickname;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    return jsonError(409, "already_approved", "You already have an active ZAAHI account. Sign in instead.");
  }

  const existingApp = await prisma.registrationApplication.findUnique({
    where: { email },
    select: { id: true, status: true },
  });
  if (existingApp) {
    if (existingApp.status === "PENDING_REVIEW" || existingApp.status === "WAITLIST") {
      return jsonError(
        409,
        "application_already_pending",
        "An application with this email is already in review. Check your inbox for the verification link, or wait for admin approval (typically 2-3 business days).",
      );
    }
    if (existingApp.status === "REJECTED") {
      return jsonError(
        409,
        "application_previously_rejected",
        "This email was previously rejected. Contact support if you believe this was in error.",
      );
    }
    if (existingApp.status === "APPROVED") {
      return jsonError(409, "already_approved", "You already have an active ZAAHI account. Sign in instead.");
    }
  }

  // Nickname dedup (collides only against non-REJECTED applications +
  // any User row). Mirrors the live check in /api/registration/check-nickname.
  const userNickHit = await prisma.user.findFirst({
    where: { nickname: { equals: nickname, mode: "insensitive" } },
    select: { id: true },
  });
  if (userNickHit) {
    return jsonError(409, "nickname_taken", "That nickname is already taken. Try another.");
  }
  const appNickHit = await prisma.registrationApplication.findFirst({
    where: {
      nickname: { equals: nickname, mode: "insensitive" },
      status: { not: "REJECTED" },
    },
    select: { id: true },
  });
  if (appNickHit) {
    return jsonError(409, "nickname_taken", "That nickname is already taken. Try another.");
  }

  // ── 3. Cap check ──────────────────────────────────────────────────
  const approvedCount = await countApprovedForRole(prisma, role);
  const status = statusForCount(approvedCount);

  // ── 4. Service-role availability ──────────────────────────────────
  if (!isSupabaseAdminAvailable()) {
    return jsonError(
      503,
      "service_unavailable",
      "Registration is temporarily unavailable. Please retry in a few minutes.",
    );
  }
  const admin = getSupabaseAdmin()!;

  // ── 5. Create the Supabase Auth user ──────────────────────────────
  // Spec §6.4 step 5. Generate a temp password the user never sees;
  // they verify email, then on admin approval use the recovery link
  // (Step 7) to set their own password.
  const tempPassword = `tmp-${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const { data: createdUser, error: createUserErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: false,
    user_metadata: { approved: false, nickname, role },
  });
  if (createUserErr || !createdUser?.user) {
    console.error("[register/submit] createUser failed:", createUserErr?.message);
    // Temp diagnostic (2026-05-11) — capture runtime context. Prefix
    // + length only; the full secret is never logged. Remove after
    // the incident. Also dumps the full error object (status, code,
    // cause) since "Internal Server Error" alone is opaque.
    const _diag = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.error(
      `[register/submit] env-diag: SERVICE_KEY prefix=${_diag?.slice(0, 6)} len=${_diag?.length ?? 0} URL=${process.env.NEXT_PUBLIC_SUPABASE_URL} VERCEL_ENV=${process.env.VERCEL_ENV} SHA=${process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8)}`,
    );
    if (createUserErr) {
      const errAsAny = createUserErr as unknown as Record<string, unknown>;
      console.error(
        `[register/submit] err-diag: name=${errAsAny.name} status=${errAsAny.status} code=${errAsAny.code} cause=${JSON.stringify(errAsAny.cause)}`,
      );
      // Native-fetch parity probe: if supabase-js fails but native
      // fetch with the same key against the same URL succeeds, the
      // bug is library-level (UA / headers). If both fail with the
      // same body, the bug is request-level (key / project state).
      try {
        const probeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`;
        const probeKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
        const probeEmail = `__diag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@zaahi-test.io`;
        const probeRes = await fetch(probeUrl, {
          method: "POST",
          headers: {
            apikey: probeKey,
            authorization: `Bearer ${probeKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email: probeEmail,
            password: `Tmp-${Date.now()}!A`,
            email_confirm: false,
          }),
        });
        const probeBody = await probeRes.text();
        console.error(
          `[register/submit] native-fetch parity: status=${probeRes.status} body=${probeBody.slice(0, 220)}`,
        );
        // Best-effort cleanup if the parity user was actually created.
        if (probeRes.status >= 200 && probeRes.status < 300) {
          try {
            const created = JSON.parse(probeBody) as { id?: string };
            if (created.id) {
              await fetch(`${probeUrl}/${created.id}`, {
                method: "DELETE",
                headers: { apikey: probeKey, authorization: `Bearer ${probeKey}` },
              });
            }
          } catch {/* ignore cleanup errors */}
        }
      } catch (probeErr) {
        console.error("[register/submit] native-fetch parity threw:", (probeErr as Error)?.message);
      }
    }
    // Map Supabase "user already exists" to a friendlier 409 so users
    // get an actionable message instead of a generic retry prompt.
    // The local Prisma dedup at step 2 only sees rows we wrote ourselves;
    // a Supabase Auth user can exist without any matching Prisma row
    // (e.g. orphan from a half-finished earlier signup, or a smoke-test
    // attempt on a preview deployment that shares the same Supabase
    // project). Surface that clearly so support can clean it up.
    const errCode = (createUserErr as { code?: string } | null | undefined)?.code;
    const errMsg = createUserErr?.message ?? "";
    const looksLikeEmailExists =
      errCode === "email_exists" ||
      errCode === "user_already_exists" ||
      /already\s*(been\s*)?registered/i.test(errMsg) ||
      /user.*already.*exists/i.test(errMsg);
    if (looksLikeEmailExists) {
      return jsonError(
        409,
        "email_already_registered",
        "This email is already registered with ZAAHI. If you've registered before, sign in instead. If you've never registered or believe this is in error, email support@zaahi.io and we'll resolve it.",
      );
    }
    return jsonError(
      500,
      "auth_signup_failed",
      "Could not create your account. Please retry — if it keeps failing, contact support.",
    );
  }
  const userId = createdUser.user.id;

  // ── Helper: rollback hooks ────────────────────────────────────────
  // Best-effort cleanup if a later step fails. Logged loudly when fail
  // — leftover state is recoverable manually.
  const rollback = async (reason: string) => {
    console.error(`[register/submit] rolling back due to: ${reason}`);
    try {
      // Remove uploaded files first (if any)
      const { data: list } = await admin.storage
        .from(BUCKET)
        .list(userId, { limit: 100 });
      if (list && list.length > 0) {
        const paths = list.map((f) => `${userId}/${f.name}`);
        const { error } = await admin.storage.from(BUCKET).remove(paths);
        if (error) console.error("[register/submit] file cleanup error:", error.message);
      }
    } catch (e) {
      console.error("[register/submit] file cleanup threw:", e);
    }
    try {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) console.error("[register/submit] deleteUser error:", error.message);
    } catch (e) {
      console.error("[register/submit] deleteUser threw:", e);
    }
  };

  // ── 6. Upload files ───────────────────────────────────────────────
  const uploadedAt = new Date().toISOString();
  const docsForJson: UploadedDocMeta[] = [];
  for (let i = 0; i < fileParts.length; i++) {
    const { kind, file } = fileParts[i];
    const ts = Date.now();
    const safe = sanitizeOriginalName(file.name);
    const path = `${userId}/${kind}-${ts}-${i}-${safe}`;
    const buf = await file.arrayBuffer();
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) {
      console.error(`[register/submit] upload failed (${path}):`, upErr.message);
      await rollback(`upload failed: ${upErr.message}`);
      return jsonError(
        500,
        "upload_failed",
        "Could not store one of your documents. Please retry.",
      );
    }
    docsForJson.push({
      kind,
      path,
      originalName: file.name,
      sizeBytes: file.size,
      contentType: file.type,
      uploadedAt,
    });
  }

  // ── 7. Generate verification (signup) link ────────────────────────
  let verificationLink = `${publicOrigin(req)}/`;
  try {
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password: tempPassword,
      options: { redirectTo: `${publicOrigin(req)}/` },
    });
    if (linkErr) {
      console.warn("[register/submit] generateLink failed:", linkErr.message);
    } else if (linkData?.properties?.action_link) {
      verificationLink = linkData.properties.action_link;
    }
  } catch (e) {
    console.warn("[register/submit] generateLink threw:", e);
  }

  // ── 8. Insert RegistrationApplication ─────────────────────────────
  let applicationId: string;
  try {
    const created = await prisma.registrationApplication.create({
      data: {
        userId,
        email,
        nickname,
        roleApplied: role,
        documentsJson: docsForJson as unknown as Prisma.InputJsonValue,
        referralPath: (body.referralPath ?? undefined) as Prisma.InputJsonValue | undefined,
        status,
        autoMigrated: false,
      },
      select: { id: true },
    });
    applicationId = created.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[register/submit] application insert failed:", msg);
    await rollback(`application insert failed: ${msg}`);
    return jsonError(
      500,
      "application_insert_failed",
      "Could not save your application. Please retry.",
    );
  }

  // ── 9. Notifications (silent failures OK) ─────────────────────────
  const roleLabel = ROLE_LABELS[role];
  const submittedAt = new Date().toUTCString();
  const queueLink = `${publicOrigin(req)}/admin/queue`;

  // Applicant email
  const applicantTpl =
    status === "WAITLIST"
      ? registrationWaitlist({
          nickname,
          role: roleLabel,
          applicationId,
          verificationLink,
        })
      : registrationReceived({
          nickname,
          role: roleLabel,
          applicationId,
          verificationLink,
          expectedSlaDays: 3,
        });
  void sendEmail({ to: email, subject: applicantTpl.subject, html: applicantTpl.html });

  // Admin email
  const adminTpl = adminNewApplication({
    nickname,
    role: roleLabel,
    applicationId,
    status,
    email,
    queueLink,
    submittedAt,
  });
  // Admin emails — TELEGRAM_ADMIN_CHAT_IDS is comma-list of integers; the
  // admin email recipients don't currently have a dedicated env. Re-use
  // the founder Gmail for the email path; spec §11 admin Telegram is the
  // primary admin channel. Email-to-admin is belt-and-suspenders.
  const adminEmailTo = process.env.ADMIN_NOTIFICATION_EMAIL ?? "zhanrysbayev@gmail.com";
  void sendEmail({ to: adminEmailTo, subject: adminTpl.subject, html: adminTpl.html });

  // Admin Telegram (multi-recipient via §11.2)
  const tgText =
    `📨 New ${roleLabel.split(" — ")[0]} application from ${nickname} (${applicationId.slice(0, 8)}…)\n` +
    `\n` +
    `Status: ${status}\n` +
    `Submitted: ${submittedAt}\n` +
    `\n` +
    `Open queue → ${queueLink}`;
  void sendTelegramToAdmins({
    text: tgText,
    parseMode: "HTML",
    disablePreview: true,
  });

  // ── 10. Respond ────────────────────────────────────────────────────
  return NextResponse.json({
    ok: true,
    applicationId,
    status,
    nickname,
    expectedReviewByDate: expectedReviewByDate(),
  });
}
