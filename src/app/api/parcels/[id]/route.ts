import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ParcelStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId, getAdminUserId } from '@/lib/auth';
import { rewriteNotes } from '@/lib/notes-rewriter';

function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
  );
}

type Ctx = { params: Promise<{ id: string }> };

// GET /api/parcels/:id  → parcel + latest affection plan
//
// The DDA "General Notes" are rewritten into plain English on the way
// out (jargon expansion, abbreviation expansion, terms like "subject to"
// → "must follow"). The DB still stores the raw DDA string verbatim;
// the response carries both:
//   plan.notes         → rewritten, plain-English version
//   plan.notesOriginal → raw DDA string
// Side panel renders the friendly version. Source-of-truth for the
// transform is `src/lib/notes-rewriter.ts`.
export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const parcel = await prisma.parcel.findUnique({
    where: { id },
    include: { affectionPlans: { orderBy: { fetchedAt: 'desc' }, take: 1 } },
  });
  if (!parcel) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // VAULT_PRIVATE gate (mirrors compare-plots/route.ts:125-149 and
  // plot-details/route.ts:100). Mandatory after the 2026-06-10 listings-to-
  // vault migration: 111 plots moved from LISTED to VAULT_PRIVATE, and
  // anyone holding an old direct URL could still GET them by id without
  // this check. 404 (not 403) is intentional — don't leak existence.
  // Admins (Zhan, Dymo) bypass the gate; vault owners pass via their
  // VaultEntry.publicParcelId link.
  if (parcel.status === ParcelStatus.VAULT_PRIVATE) {
    const adminId = await getAdminUserId(req);
    if (!adminId || adminId !== userId) {
      const entry = await prisma.vaultEntry.findFirst({
        where: { ownerId: userId, publicParcelId: id },
        select: { id: true },
      });
      if (!entry) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
    }
  }

  // Apply the plain-language rewriter to every affection plan note.
  // The serialiser handles BigInts; we attach `notesOriginal` and
  // overwrite `notes` per plan in place before serialising.
  const decorated = {
    ...parcel,
    affectionPlans: parcel.affectionPlans.map((p) => ({
      ...p,
      notesOriginal: p.notes,
      notes: rewriteNotes(p.notes),
    })),
  };
  return NextResponse.json(serialize(decorated));
}

// PATCH /api/parcels/:id  — only the owner can update.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  // Step 12 audit B-1 / SF-1: spec §5.4.1 LOCK-8 — ownerId is the
  // immutable creator; verifiedOwnerUserId is the current verified
  // owner. Either has legitimate reason to mutate the parcel (creator
  // for canonical metadata; verified owner for price/status/listing
  // lifecycle). Without this dual gate, the verified owner of any of
  // the 118 system-seeded parcels would be locked out of their own
  // listing once Step 10 verifies their Title Deed.
  const existing = await prisma.parcel.findUnique({
    where: { id },
    select: { ownerId: true, verifiedOwnerUserId: true },
  });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.ownerId !== userId && existing.verifiedOwnerUserId !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Whitelist of mutable fields. ownerId / plotNumber identity stays out.
  const data: Prisma.ParcelUpdateInput = {};
  if (typeof body.area === 'number' && body.area > 0) data.area = body.area;
  if (typeof body.emirate === 'string') data.emirate = body.emirate;
  if (typeof body.district === 'string') data.district = body.district;
  if (typeof body.latitude === 'number') data.latitude = body.latitude;
  if (typeof body.longitude === 'number') data.longitude = body.longitude;
  if (body.geometry !== undefined) data.geometry = body.geometry as Prisma.InputJsonValue;
  if (typeof body.isTokenized === 'boolean') data.isTokenized = body.isTokenized;
  if (typeof body.status === 'string' && (Object.values(ParcelStatus) as string[]).includes(body.status)) {
    data.status = body.status as ParcelStatus;
  }
  if (body.currentValuation != null) {
    data.currentValuation = BigInt(body.currentValuation as string | number);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'no_updatable_fields' }, { status: 400 });
  }

  const updated = await prisma.parcel.update({ where: { id }, data });
  return NextResponse.json(serialize(updated));
}

// DELETE /api/parcels/:id  — disabled. Parcels are never deleted from
// the database (CLAUDE.md "NEVER delete parcels — ever"). The platform
// instead transitions a parcel through its ParcelStatus lifecycle
// (PENDING_REVIEW → REJECTED for failed reviews, LISTED → IN_DEAL →
// SOLD for live trades, etc) so the row is preserved for audit, deal
// history, AffectionPlan provenance, and LOCK-8 owner-immutability.
//
// 2026-06-02 diagnostic finding: the previous handler claimed to be
// "kept defensively intact" but actually called prisma.parcel.delete().
// No client surface invoked it, but the latent endpoint contradicted
// the invariant the comment claimed to defend. Switched to an explicit
// 405 Method Not Allowed so the rule is enforced at the HTTP boundary.
// If a future surface needs to "remove" a parcel from user-facing
// views, route it through PATCH with status: "REJECTED" or
// status: "FROZEN" instead — the row stays.
export async function DELETE(_req: NextRequest, _ctx: Ctx) {
  return NextResponse.json(
    {
      error: 'method_not_allowed',
      message:
        'Parcels cannot be deleted. Use PATCH with status REJECTED or FROZEN to retire a listing without losing the row.',
    },
    { status: 405, headers: { Allow: 'GET, PATCH' } },
  );
}
