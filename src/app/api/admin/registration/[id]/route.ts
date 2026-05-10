// GET /api/admin/registration/[id]  — full detail for one application.
//
// Returns the row + email_confirmed_at from Supabase Auth + signed URLs
// for every doc path in documentsJson (TTL 7d per spec §12.3).
//
// Auth: getAdminUserId only.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { signRegistrationDocs, type SignedDoc } from "@/lib/storage-signed-url";
import { serialize } from "@/lib/serialize";

export const runtime = "nodejs";

interface DocsArrayItem {
  kind: string;
  path: string;
  originalName?: string;
  sizeBytes?: number;
  contentType?: string;
  uploadedAt?: string;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const row = await prisma.registrationApplication.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // ── Email verification status ─────────────────────────────────────
  let emailConfirmedAt: string | null = null;
  let realName: string | null = null;
  if (row.userId) {
    const admin = getSupabaseAdmin();
    if (admin) {
      try {
        const { data, error } = await admin.auth.admin.getUserById(row.userId);
        if (!error && data?.user) {
          emailConfirmedAt = data.user.email_confirmed_at ?? null;
        }
      } catch (e) {
        console.warn("[admin/registration/detail] getUserById failed:", e);
      }
    }
    const userRow = await prisma.user.findUnique({
      where: { id: row.userId },
      select: { name: true },
    });
    realName = userRow?.name ?? null;
  }

  // ── Signed URLs for documents ────────────────────────────────────
  let docs: Array<DocsArrayItem & { signedUrl: string | null; expiresAt: string | null }> = [];
  if (Array.isArray(row.documentsJson)) {
    const items = row.documentsJson as unknown as DocsArrayItem[];
    const paths = items
      .filter((d) => typeof d.path === "string")
      .map((d) => d.path);
    const signed: (SignedDoc | null)[] = await signRegistrationDocs(paths);
    docs = items.map((d, i) => {
      const s = signed[i];
      return {
        ...d,
        signedUrl: s?.signedUrl ?? null,
        expiresAt: s?.expiresAt ?? null,
      };
    });
  }

  return NextResponse.json(
    serialize({
      application: row,
      emailVerified: !!emailConfirmedAt,
      emailConfirmedAt,
      realName,
      documents: docs,
    }),
  );
}
