// GET /api/admin/users — platform user list for the admin Pause / Resume
// console (/admin/users). Admin-only (getAdminUserId): this response
// carries emails and real names, which non-admin responses must never
// include (CLAUDE.md PII rule).
//
// Query params:
//   q       = substring search across email + name + nickname (insensitive)
//   status  = ACTIVE | PAUSED (default: both)
//   limit   = 1..100 (default 50)
//   cursor  = id of the last item from the previous page
//
// Response: {
//   items: Array<UserAccessRow & { pausedByEmail, isFounder, isSelf }>,
//   nextCursor: string | null,
//   total: number,
//   selfId: string
// }

import { NextRequest, NextResponse } from "next/server";
import { AccessStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminUserId, isFounderEmail } from "@/lib/auth";
import { USER_ACCESS_SELECT } from "@/lib/user-access";
import { serialize } from "@/lib/serialize";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = req.nextUrl;
  const q = url.searchParams.get("q")?.trim();
  const statusParam = url.searchParams.get("status");
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;
  const cursor = url.searchParams.get("cursor");

  const status =
    statusParam === AccessStatus.ACTIVE || statusParam === AccessStatus.PAUSED
      ? (statusParam as AccessStatus)
      : null;

  const where: Prisma.UserWhereInput = {
    ...(status ? { accessStatus: status } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { nickname: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      // Paused first, then newest — the rows an admin came to act on
      // sit at the top of the default view.
      orderBy: [{ accessStatus: "desc" }, { createdAt: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: USER_ACCESS_SELECT,
    }),
  ]);

  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;

  // Resolve "paused by" to an email in one extra query.
  const actorIds = [...new Set(sliced.map((r) => r.pausedById).filter((v): v is string => !!v))];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true } })
    : [];
  const actorEmail = new Map(actors.map((a) => [a.id, a.email]));

  const items = sliced.map((r) => ({
    ...r,
    pausedByEmail: r.pausedById ? actorEmail.get(r.pausedById) ?? null : null,
    isFounder: isFounderEmail(r.email),
    isSelf: r.id === adminId,
  }));

  return NextResponse.json(
    serialize({
      items,
      nextCursor: hasMore ? sliced[sliced.length - 1].id : null,
      total,
      selfId: adminId,
    }),
    { headers: { "cache-control": "private, no-store" } },
  );
}
