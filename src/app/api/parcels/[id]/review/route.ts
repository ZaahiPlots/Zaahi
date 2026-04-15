import { NextRequest, NextResponse } from 'next/server';
import { ParcelStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminUserId } from '@/lib/auth';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

const ReviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  note: z.string().trim().max(1000).optional(),
});

/**
 * PATCH /api/parcels/:id/review — admin approve/reject a PENDING_REVIEW
 * submission. Approve → status becomes LISTED (public). Reject → status
 * becomes REJECTED (hidden from map, preserved in DB — never delete per
 * CLAUDE.md "NEVER delete parcels — ever").
 *
 * Only callers that pass {@link getAdminUserId} may review.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const adminId = await getAdminUserId(req);
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = ReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }
  const { action, note } = parsed.data;

  const parcel = await prisma.parcel.findUnique({
    where: { id },
    select: { id: true, status: true, plotNumber: true },
  });
  if (!parcel) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (parcel.status !== ParcelStatus.PENDING_REVIEW) {
    return NextResponse.json(
      { error: 'not_pending', currentStatus: parcel.status },
      { status: 409 },
    );
  }

  const nextStatus =
    action === 'APPROVE' ? ParcelStatus.LISTED : ParcelStatus.REJECTED;

  const updated = await prisma.parcel.update({
    where: { id },
    data: { status: nextStatus },
    select: { id: true, status: true, plotNumber: true },
  });

  // Audit trail as a fresh AffectionPlan row (append, never delete —
  // same rule as submit). Carries reviewer id and optional note so we
  // can trace who approved what and why.
  await prisma.affectionPlan.create({
    data: {
      parcelId: updated.id,
      source: `review:${action.toLowerCase()}`,
      plotNumber: updated.plotNumber,
      landUseMix: [],
      notes: note ?? null,
      raw: {
        action,
        note: note ?? null,
        reviewedBy: adminId,
        reviewedAt: new Date().toISOString(),
      } as unknown as Parameters<typeof prisma.affectionPlan.create>[0]['data']['raw'],
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
