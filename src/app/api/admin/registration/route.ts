// GET /api/admin/registration — list cohort applications.
//
// Auth: getAdminUserId (approved + (founder email | role=ADMIN)).
//
// Query params:
//   status   = comma-separated RegistrationStatus[] (default: all 4)
//   role     = comma-separated UserRole[] (default: any)
//   q        = substring search across email + nickname (case-insensitive)
//   limit    = 1..100 (default 50)
//   cursor   = id of the last item from the previous page
//   includeAutoMigrated = "1" to include autoMigrated rows (default: false,
//                          spec §5.3 + §7.3 — they don't count toward caps
//                          and shouldn't clutter the queue)
//
// Response: {
//   items: Array<{ ...full row..., emailVerified, emailConfirmedAt }>,
//   nextCursor: string | null,
//   total: number   // count matching the filter (NOT respecting cursor)
// }

import { NextRequest, NextResponse } from "next/server";
import type { Prisma, RegistrationStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { serialize } from "@/lib/serialize";

export const runtime = "nodejs";

const VALID_STATUSES: RegistrationStatus[] = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "WAITLIST",
];

const VALID_ROLES: UserRole[] = [
  "OWNER",
  "BROKER",
  "DEVELOPER",
  "BUYER",
  "ARCHITECT",
  "POA",
  "INTERMEDIARY",
  "RELATIVE",
  "REFERRAL",
  "OTHER",
];

export async function GET(req: NextRequest) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = req.nextUrl;
  const statusParam = url.searchParams.get("status");
  const roleParam = url.searchParams.get("role");
  const q = url.searchParams.get("q")?.trim();
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;
  const cursor = url.searchParams.get("cursor");
  const includeAutoMigrated = url.searchParams.get("includeAutoMigrated") === "1";

  const statuses = statusParam
    ? (statusParam
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is RegistrationStatus =>
          (VALID_STATUSES as string[]).includes(s),
        ) as RegistrationStatus[])
    : VALID_STATUSES;

  const roles = roleParam
    ? (roleParam
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is UserRole => (VALID_ROLES as string[]).includes(s)) as UserRole[])
    : null;

  const where: Prisma.RegistrationApplicationWhereInput = {
    status: { in: statuses },
    ...(roles ? { roleApplied: { in: roles } } : {}),
    ...(includeAutoMigrated ? {} : { autoMigrated: false }),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { nickname: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.registrationApplication.count({ where }),
    prisma.registrationApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1, // +1 to detect more
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    }),
  ]);

  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;

  // Enrich with email_confirmed_at from Supabase Auth. Cohort-scale
  // batch (≤ ~100 admin users) — single listUsers call per request,
  // build a map, then attach.
  let authMap = new Map<string, { emailConfirmedAt: string | null }>();
  const admin = getSupabaseAdmin();
  if (admin) {
    try {
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
      if (list?.users) {
        for (const u of list.users) {
          authMap.set(u.id, {
            emailConfirmedAt: u.email_confirmed_at ?? null,
          });
        }
      }
    } catch (e) {
      console.warn("[admin/registration list] listUsers failed:", e);
    }
  }

  const items = sliced.map((r) => {
    const authMeta = r.userId ? authMap.get(r.userId) : undefined;
    const emailConfirmedAt = authMeta?.emailConfirmedAt ?? null;
    return {
      ...r,
      emailConfirmedAt,
      emailVerified: !!emailConfirmedAt,
    };
  });

  return NextResponse.json(
    serialize({
      items,
      nextCursor: hasMore ? sliced[sliced.length - 1].id : null,
      total,
    }),
  );
}
