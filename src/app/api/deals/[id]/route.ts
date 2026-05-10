import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { recordDealEvent } from "@/lib/blockchain";
import { validateAction, DealAction, getRole } from "@/lib/deal-flow";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/deals/:id — full deal data, only for participants.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  // PDPL §12.5 / Step 11 P1-2: counterparty profile is minimised to
  // the public shape (id + nickname + role + brand fields). Real name
  // stays out of the per-deal API response — it's available only to
  // admins and at formal deal-document signing time. Email + phone
  // are not exposed; if a future deal-stage UX needs them, route
  // through an explicit "reveal contact" surface with an audit log.
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      parcel: { include: { affectionPlans: { orderBy: { fetchedAt: "desc" }, take: 1 } } },
      seller: {
        select: {
          id: true, nickname: true, role: true,
          avatarUrl: true, companyName: true, reraLicense: true,
        },
      },
      buyer: {
        select: {
          id: true, nickname: true, role: true,
          avatarUrl: true, companyName: true, reraLicense: true,
        },
      },
      broker: {
        select: {
          id: true, nickname: true, role: true,
          avatarUrl: true, companyName: true, reraLicense: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, nickname: true } } },
      },
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

  // On COMPLETE: freeze platform fee (2% of agreedPrice) onto the Deal row
  // for audit. Commission attribution itself is dormant — TODO: blockchain
  // attribution — Phase B (per spec-05 §13.3).
  //
  // Concurrency: use updateMany with a status-match predicate (optimistic
  // concurrency control). If two COMPLETE requests race, only the one that
  // transitions `deal.status` from its pre-transaction value wins — the
  // other sees updated.count === 0 and aborts.
  let raceAborted = false;
  const { updated } = await prisma.$transaction(async (tx) => {
    // Freeze platform fee on the Deal row itself for audit (2% = 200 / 10000,
    // integer math to avoid floating-point drift).
    if (action === "COMPLETE") {
      const agreed = data.agreedPriceInFils ?? deal.offerPriceInFils ?? deal.priceInFils;
      if (agreed && agreed > BigInt(0)) {
        data.platformFeeFils = (agreed * BigInt(200)) / BigInt(10000);
      }
    }

    const updateRes = await tx.deal.updateMany({
      where: { id, status: deal.status },
      data,
    });
    if (updateRes.count === 0) {
      raceAborted = true;
      const current = await tx.deal.findUnique({ where: { id } });
      return { updated: current! };
    }
    const updatedRow = (await tx.deal.findUnique({ where: { id } }))!;
    return { updated: updatedRow };
  });

  if (raceAborted) {
    // The concurrent request already performed the state transition.
    // Return 409 Conflict so the client can resync rather than assume success.
    return NextResponse.json(
      { error: "concurrent_update", currentStatus: updated.status },
      { status: 409 },
    );
  }

  // Blockchain event + audit log (outside transaction — best-effort).
  // These are append-only and don't need to be atomic with the deal update.
  const { txHash } = await recordDealEvent(id, v.def.eventType, documentHash);
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
