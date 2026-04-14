import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { recordDealEvent } from "@/lib/blockchain";
import { validateAction, DealAction, getRole } from "@/lib/deal-flow";
import { awardCommissions, computePlatformFee, reverseCommissions } from "@/lib/ambassador";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/deals/:id — full deal data, only for participants.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      parcel: { include: { affectionPlans: { orderBy: { fetchedAt: "desc" }, take: 1 } } },
      seller: { select: { id: true, name: true, email: true } },
      buyer: { select: { id: true, name: true, email: true } },
      broker: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { user: { select: { id: true, name: true } } } },
      auditEvents: { orderBy: { createdAt: "asc" } },
      documents: true,
    },
  });
  if (!deal) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!getRole(deal, userId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json(serialize(deal));
}

/**
 * PATCH /api/deals/:id — perform a state-machine action.
 *
 * body: { action: DealAction, counterPriceAed?, conditions?, documentHash?, dldReference?, rating? }
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const action = body.action as DealAction;
  if (!action) return NextResponse.json({ error: "missing_action" }, { status: 400 });

  const deal = await prisma.deal.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      sellerId: true,
      buyerId: true,
      brokerId: true,
      dldApproved: true,
      offerPriceInFils: true,
      priceInFils: true,
    },
  });
  if (!deal) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const v = validateAction(deal, userId, action);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 403 });

  // Build update payload
  const data: any = {};
  const eventMeta: any = {};

  if (action === "COUNTER") {
    const counterPriceAed = Number(body.counterPriceAed);
    if (!Number.isFinite(counterPriceAed) || counterPriceAed <= 0) {
      return NextResponse.json({ error: "invalid_counter_price" }, { status: 400 });
    }
    const fils = BigInt(Math.round(counterPriceAed * 100));
    data.offerPriceInFils = fils;
    data.priceInFils = fils;
    if (typeof body.conditions === "string") data.conditions = body.conditions;
    eventMeta.counterPriceFils = fils.toString();
  } else if (action === "ACCEPT") {
    // Lock in agreed price = current offer
    data.agreedPriceInFils = deal.offerPriceInFils ?? deal.priceInFils;
    data.status = v.def.toStatus;
    eventMeta.agreedPriceFils = (deal.offerPriceInFils ?? deal.priceInFils).toString();
  } else {
    data.status = v.def.toStatus;
  }

  if (v.def.setFlags) Object.assign(data, v.def.setFlags);

  if (action === "DLD_SUBMIT" && typeof body.dldReference === "string") {
    data.dldReference = body.dldReference;
    eventMeta.dldReference = body.dldReference;
  }
  if (action === "COMPLETE" && Number.isInteger(body.rating)) {
    const r = Math.max(1, Math.min(5, body.rating));
    data.rating = r;
    eventMeta.rating = r;
  }

  const documentHash = typeof body.documentHash === "string" ? body.documentHash : null;

  // On COMPLETE: compute platform fee (0.25% of agreedPrice) and award
  // ambassador commissions atomically in the same transaction as the
  // deal status update. On CANCEL/DISPUTE: claw back pending commissions.
  const { updated, commissionsCreated, commissionsReversed } = await prisma.$transaction(async (tx) => {
    // Freeze platform fee on the Deal row itself for audit
    if (action === "COMPLETE") {
      const agreed = data.agreedPriceInFils ?? deal.offerPriceInFils ?? deal.priceInFils;
      if (agreed && agreed > BigInt(0)) {
        data.platformFeeFils = computePlatformFee(agreed);
      }
    }

    const updatedRow = await tx.deal.update({ where: { id }, data });

    let created = 0;
    let reversed = 0;

    if (action === "COMPLETE" && updatedRow.platformFeeFils && updatedRow.platformFeeFils > BigInt(0)) {
      created = await awardCommissions(
        tx,
        updatedRow.id,
        deal.sellerId,
        deal.buyerId,
        updatedRow.platformFeeFils,
      );
    }

    if (action === "CANCEL" || action === "DISPUTE") {
      reversed = await reverseCommissions(tx, id);
    }

    return { updated: updatedRow, commissionsCreated: created, commissionsReversed: reversed };
  });

  // Blockchain event + audit log (outside transaction — best-effort).
  // These are append-only and don't need to be atomic with the deal update.
  const { txHash } = await recordDealEvent(id, v.def.eventType, documentHash);
  if (commissionsCreated > 0) eventMeta.commissionsCreated = commissionsCreated;
  if (commissionsReversed > 0) eventMeta.commissionsReversed = commissionsReversed;
  if (action === "COMPLETE" && updated.platformFeeFils) {
    eventMeta.platformFeeFils = updated.platformFeeFils.toString();
  }
  await prisma.dealAuditEvent.create({
    data: {
      dealId: id,
      eventType: v.def.eventType,
      txHash,
      documentHash,
      metadata: eventMeta,
    },
  });

  return NextResponse.json(serialize({ ok: true, deal: updated }));
}
