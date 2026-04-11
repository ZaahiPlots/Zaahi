import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { recordDealEvent } from "@/lib/blockchain";

/**
 * GET /api/deals — list deals where the current user is buyer, seller, or broker.
 */
export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const deals = await prisma.deal.findMany({
    where: {
      OR: [{ sellerId: userId }, { buyerId: userId }, { brokerId: userId }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      parcel: { select: { id: true, plotNumber: true, district: true, emirate: true, area: true } },
    },
  });
  return NextResponse.json(serialize(deals));
}

/**
 * POST /api/deals — buyer submits an offer on a parcel.
 *
 * body: { parcelId, offerPriceAed, paymentType, closingDays?, conditions?, message?, mortgageBank?, mortgageAmountAed? }
 */
export async function POST(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parcelId = String(body.parcelId || "");
  const offerPriceAed = Number(body.offerPriceAed);
  const paymentType = String(body.paymentType || "CASH").toUpperCase();

  if (!parcelId || !Number.isFinite(offerPriceAed) || offerPriceAed <= 0) {
    return NextResponse.json({ error: "missing_or_invalid_fields" }, { status: 400 });
  }
  if (!["CASH", "MORTGAGE", "INSTALLMENT"].includes(paymentType)) {
    return NextResponse.json({ error: "invalid_payment_type" }, { status: 400 });
  }

  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    select: { id: true, ownerId: true, status: true },
  });
  if (!parcel) return NextResponse.json({ error: "parcel_not_found" }, { status: 404 });
  if (parcel.ownerId === userId) {
    return NextResponse.json({ error: "cannot_offer_on_own_parcel" }, { status: 400 });
  }

  // fils = AED * 100 (BigInt). Round to integer fils to avoid float drift.
  const offerFils = BigInt(Math.round(offerPriceAed * 100));
  const closingDays = Number.isInteger(body.closingDays) ? body.closingDays : 90;
  const mortgageAmountFils =
    body.mortgageAmountAed != null && Number.isFinite(Number(body.mortgageAmountAed))
      ? BigInt(Math.round(Number(body.mortgageAmountAed) * 100))
      : null;

  const deal = await prisma.deal.create({
    data: {
      parcelId,
      sellerId: parcel.ownerId,
      buyerId: userId,
      status: "INITIAL",
      priceInFils: offerFils,
      offerPriceInFils: offerFils,
      paymentType,
      mortgageBank: typeof body.mortgageBank === "string" ? body.mortgageBank : null,
      mortgageAmount: mortgageAmountFils,
      closingDays,
      conditions: typeof body.conditions === "string" ? body.conditions : null,
      initialMessage: typeof body.message === "string" ? body.message : null,
    },
  });

  // Audit + blockchain (fire-and-forget pending fallback inside).
  const { txHash } = await recordDealEvent(deal.id, "OFFER_SUBMITTED");
  await prisma.dealAuditEvent.create({
    data: {
      dealId: deal.id,
      eventType: "OFFER_SUBMITTED",
      txHash,
      metadata: { offerPriceFils: offerFils.toString(), paymentType, closingDays },
    },
  });

  // If buyer included an opening message, persist it as the first chat entry.
  if (typeof body.message === "string" && body.message.trim()) {
    await prisma.dealMessage.create({
      data: { dealId: deal.id, userId, content: body.message.trim() },
    });
  }

  return NextResponse.json({ id: deal.id });
}
