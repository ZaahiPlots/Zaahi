import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { getRole } from "@/lib/deal-flow";

type Ctx = { params: Promise<{ id: string }> };

async function authorizedDeal(id: string, userId: string) {
  const deal = await prisma.deal.findUnique({
    where: { id },
    select: { id: true, sellerId: true, buyerId: true, brokerId: true },
  });
  if (!deal) return null;
  if (!getRole(deal, userId)) return null;
  return deal;
}

/** GET /api/deals/:id/messages?since=ISO  → new messages for chat polling. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const deal = await authorizedDeal(id, userId);
  if (!deal) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const since = req.nextUrl.searchParams.get("since");
  const where: any = { dealId: id };
  if (since) {
    const d = new Date(since);
    if (!isNaN(d.getTime())) where.createdAt = { gt: d };
  }
  const messages = await prisma.dealMessage.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true } } },
    take: 200,
  });
  return NextResponse.json(serialize(messages));
}

/** POST /api/deals/:id/messages  body: { content, fileUrl? } */
export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const deal = await authorizedDeal(id, userId);
  if (!deal) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const content = String(body.content || "").trim();
  if (!content) return NextResponse.json({ error: "empty_message" }, { status: 400 });
  if (content.length > 4000) return NextResponse.json({ error: "message_too_long" }, { status: 400 });

  const msg = await prisma.dealMessage.create({
    data: {
      dealId: id,
      userId,
      content,
      fileUrl: typeof body.fileUrl === "string" ? body.fileUrl : null,
    },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json(serialize(msg));
}
