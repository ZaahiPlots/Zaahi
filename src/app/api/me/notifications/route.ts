// GET /api/me/notifications — current user's inbox.
// Query: ?unread=1 to filter unread only. Returns 100 most recent.
//
// Notification is append-only from the server side (triggered by events
// elsewhere — new offer, view spike, saved-search match). This route
// only reads + marks read.

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";

  const where: Prisma.NotificationWhereInput = { userId };
  if (unreadOnly) where.readAt = null;

  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return NextResponse.json({
    items: rows,
    count: rows.length,
    unreadCount,
  });
}
