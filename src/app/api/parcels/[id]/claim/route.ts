// POST /api/parcels/[id]/claim — Path C, multi-claim Add Plot.
//
// Spec source: spec-05 §8.4 (server steps 1-5) + §5.4 (PlotClaim model
// + verifiable-vs-self-declared role table) + §11.3 (admin notification).
//
// Multipart shape (mirrors /api/registration/submit so the modal can
// re-use the same upload pattern):
//   text  field "data"    — JSON string { role: UserRole, priceAed: number }
//   file  fields "file_<kind>_<index>"  — claim docs per role,
//                                         multiple files per kind allowed
//
// Order of operations:
//   1. Auth: getApprovedUserId.
//   2. Resolve parcel by id; 404 if missing.
//   3. Parse multipart text JSON; validate role + price (Zod-shaped).
//   4. Validate file MIME + size; validate role-specific doc requirements.
//   5. Pre-flight existence check — return 409 plot_already_claimed if
//      the caller already has a non-REJECTED claim. (DB-unique catches
//      the race; this just gives a friendlier message on the common
//      double-click case.)
//   6. Service-role storage upload to private "registration-docs" bucket
//      under <userId>/plot-claims/<parcelId>/<kind>-<ts>-<i>-<safe>.<ext>.
//      Re-uses the bucket because Step 11 PDPL audit will sweep all
//      claim docs together.
//   7. Insert PlotClaim row. Catches Prisma P2002 (unique violation
//      from §8.4 step 3 invariant) → 409.
//   8. Notification: send admin-new-plot-claim email + Telegram if
//      status=PENDING. SELF_DECLARED claims don't notify (admin doesn't
//      act on them).

import { NextRequest, NextResponse } from "next/server";
import { Prisma, UserRole, ClaimStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase-admin";
import {
  PLOT_CLAIM_DOC_REQUIREMENTS,
  validateClaimDocs,
  CLAIM_MAX_FILE_BYTES,
  CLAIM_ALLOWED_MIME,
  type ClaimDocKind,
} from "@/lib/plot-claim-doc-requirements";
import { claimStatusForRole, isVerifiableRole } from "@/lib/plot-claim";
import { sendEmail } from "@/lib/email";
import { sendTelegramToAdmins } from "@/lib/telegram";
import { adminNewPlotClaim } from "@/lib/email-templates/admin-new-plot-claim";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "registration-docs";

type Ctx = { params: Promise<{ id: string }> };

// Cohort-applicant roles only — ADMIN / INVESTOR are never selected
// from a UI form path. Spec §5.4 + §5.1.
const COHORT_ROLES = [
  UserRole.OWNER,
  UserRole.BROKER,
  UserRole.DEVELOPER,
  UserRole.BUYER,
  UserRole.ARCHITECT,
  UserRole.POA,
  UserRole.INTERMEDIARY,
  UserRole.RELATIVE,
  UserRole.REFERRAL,
  UserRole.OTHER,
] as const;

const ClaimSchema = z.object({
  role: z.enum(COHORT_ROLES),
  priceAed: z.number().positive("price_must_be_positive").max(1e13, "price_too_large"),
});

function jsonError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

function publicOrigin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.zaahi.io";
}

function sanitizeOriginalName(name: string): string {
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

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  // ── 1. Auth ────────────────────────────────────────────────────────
  const userId = await getApprovedUserId(req);
  if (!userId) {
    return jsonError(401, "unauthorized", "Sign in required.");
  }

  const { id: parcelId } = await params;

  // ── 2. Resolve parcel ─────────────────────────────────────────────
  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    select: { id: true, plotNumber: true, district: true, emirate: true },
  });
  if (!parcel) {
    return jsonError(404, "parcel_not_found", "Plot not found.");
  }

  // ── 3. Parse multipart text body ──────────────────────────────────
  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    return jsonError(400, "invalid_multipart", `Could not parse upload: ${(e as Error).message}`);
  }

  const dataField = form.get("data");
  if (typeof dataField !== "string") {
    return jsonError(400, "missing_data_field", 'Multipart body must contain a string "data" field.');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(dataField);
  } catch {
    return jsonError(400, "invalid_data_json", '"data" field must be valid JSON.');
  }

  const result = ClaimSchema.safeParse(parsedJson);
  if (!result.success) {
    return jsonError(400, "validation_failed", "Field validation failed.", {
      issues: result.error.issues.map((i) => ({ path: i.path, message: i.message })),
    });
  }
  const { role, priceAed } = result.data;

  // ── 4. Files: collect, validate MIME/size + role docs ─────────────
  type FilePart = { kind: ClaimDocKind; file: File };
  const fileParts: FilePart[] = [];
  for (const [key, val] of form.entries()) {
    if (!key.startsWith("file_") || !(val instanceof File)) continue;
    const m = key.match(/^file_([a-z_]+)_(\d+)$/);
    if (!m) continue;
    fileParts.push({ kind: m[1] as ClaimDocKind, file: val });
  }
  for (const p of fileParts) {
    if (p.file.size > CLAIM_MAX_FILE_BYTES) {
      return jsonError(400, "file_too_large", `File '${p.file.name}' exceeds 10 MiB.`);
    }
    if (!CLAIM_ALLOWED_MIME.has(p.file.type)) {
      return jsonError(400, "invalid_mime", `File '${p.file.name}' has unsupported type '${p.file.type}'.`);
    }
  }

  const provided = new Set<ClaimDocKind>(fileParts.map((p) => p.kind));
  const docCheck = validateClaimDocs(role, provided);
  if (!docCheck.ok) {
    return jsonError(400, "missing_documents", "Required documents are missing for this role.", {
      required: docCheck.required,
      missing: docCheck.missing,
    });
  }

  // ── 5. Pre-flight existence check ─────────────────────────────────
  // Catches the common double-click before we touch storage. The new
  // @@unique([parcelId, userId]) constraint covers the race.
  const existing = await prisma.plotClaim.findFirst({
    where: { parcelId, userId },
    select: { id: true, status: true, roleAtClaim: true },
  });
  if (existing && existing.status !== ClaimStatus.REJECTED) {
    return jsonError(
      409,
      "plot_already_claimed",
      "You already have a claim on this plot. One user can claim each plot once.",
      { claimId: existing.id, role: existing.roleAtClaim, status: existing.status },
    );
  }

  // ── 6. Upload to private bucket (only if role requires docs) ──────
  const uploadedAt = new Date().toISOString();
  type UploadedDocMeta = {
    kind: string;
    path: string;
    originalName: string;
    sizeBytes: number;
    contentType: string;
    uploadedAt: string;
  };
  const docsForJson: UploadedDocMeta[] = [];

  const requiresDocs = PLOT_CLAIM_DOC_REQUIREMENTS[role].required;
  if (requiresDocs && fileParts.length > 0) {
    if (!isSupabaseAdminAvailable()) {
      return jsonError(503, "service_unavailable", "Upload service unavailable. Retry shortly.");
    }
    const admin = getSupabaseAdmin()!;
    for (let i = 0; i < fileParts.length; i++) {
      const { kind, file } = fileParts[i];
      const ts = Date.now();
      const safe = sanitizeOriginalName(file.name);
      const path = `${userId}/plot-claims/${parcelId}/${kind}-${ts}-${i}-${safe}`;
      const buf = await file.arrayBuffer();
      const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) {
        console.error(`[parcels/claim] upload failed (${path}):`, upErr.message);
        // Best-effort cleanup of any prior uploads in this request
        if (docsForJson.length > 0) {
          await admin.storage.from(BUCKET).remove(docsForJson.map((d) => d.path));
        }
        return jsonError(500, "upload_failed", "Could not store one of your documents. Please retry.");
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
  }

  // ── 7. Insert PlotClaim ───────────────────────────────────────────
  // priceAed column is in fils despite the name (spec §5.4 comment).
  const priceFils = BigInt(Math.round(priceAed)) * BigInt(100);
  const status = claimStatusForRole(role);

  let claimId: string;
  try {
    const created = await prisma.plotClaim.create({
      data: {
        parcelId,
        userId,
        roleAtClaim: role,
        priceAed: priceFils,
        status,
        documentsJson:
          docsForJson.length > 0 ? (docsForJson as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      select: { id: true },
    });
    claimId = created.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return jsonError(
        409,
        "plot_already_claimed",
        "You already have a claim on this plot. One user can claim each plot once.",
      );
    }
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[parcels/claim] insert failed:", msg);
    // Cleanup uploaded files if the insert failed for any other reason.
    if (docsForJson.length > 0 && isSupabaseAdminAvailable()) {
      const admin = getSupabaseAdmin()!;
      await admin.storage.from(BUCKET).remove(docsForJson.map((d) => d.path));
    }
    return jsonError(500, "claim_insert_failed", "Could not save your claim. Please retry.");
  }

  // Activity log — uses nicknames per spec §12.5; payload here is
  // structural, no PII.
  void logActivity({
    userId,
    kind: "PLOT_CLAIM_CREATED",
    ref: parcelId,
    payload: { claimId, role, status },
  });

  // ── 8. Admin notification (PENDING only) ──────────────────────────
  if (status === ClaimStatus.PENDING) {
    const submittedAt = new Date().toUTCString();
    const queueLink = `${publicOrigin(req)}/admin/queue?tab=plotclaim`;

    // Fetch the user's nickname for the email subject + body.
    const userRow = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, email: true },
    });
    const nickname = userRow?.nickname ?? userId.slice(0, 8);
    const adminTpl = adminNewPlotClaim({
      nickname,
      role: String(role),
      claimId,
      parcelPlotNumber: parcel.plotNumber,
      parcelDistrict: parcel.district,
      priceAed: `${priceAed.toLocaleString("en-US")} AED`,
      queueLink,
      submittedAt,
    });
    const adminEmailTo = process.env.ADMIN_NOTIFICATION_EMAIL ?? "zhanrysbayev@gmail.com";
    void sendEmail({ to: adminEmailTo, subject: adminTpl.subject, html: adminTpl.html });

    const tgText =
      `🪪 New ${role} claim on plot ${parcel.plotNumber} from ${nickname} (${claimId.slice(0, 8)}…)\n` +
      `\n` +
      `District: ${parcel.district}\n` +
      `Stated price: ${priceAed.toLocaleString("en-US")} AED\n` +
      `Submitted: ${submittedAt}\n` +
      `\n` +
      `Verify → ${queueLink}`;
    void sendTelegramToAdmins({ text: tgText, parseMode: "HTML", disablePreview: true });
  }

  return NextResponse.json({
    ok: true,
    claimId,
    parcelId,
    status,
    verifiable: isVerifiableRole(role),
  });
}
