import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ParcelStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';
import { rewriteNotes } from '@/lib/notes-rewriter';
import { stripInternalLines } from '@/lib/notes-strip';

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
// → "must follow"). Phase B 2026-05-24 adds an upstream
// `stripInternalLines` pass that removes ZAAHI debug prefixes (e.g.
// "ZAAHI: land use defaulted…", "Plot 6817016 · …", geometry asides)
// so the side panel + PDF never show service text. Founder spec: no
// admin bypass — internal lines are hidden everywhere identically.
//
// The DB still stores the raw DDA string verbatim; the response
// carries both:
//   plan.notes         → stripped + rewritten, plain-English version
//   plan.notesOriginal → raw DDA string (untouched, audit-trail)
// Side panel renders the friendly version. Source-of-truth for the
// transforms are `src/lib/notes-strip.ts` (filter) and
// `src/lib/notes-rewriter.ts` (lexical rewrite).
export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const parcel = await prisma.parcel.findUnique({
    where: { id },
    include: { affectionPlans: { orderBy: { fetchedAt: 'desc' }, take: 1 } },
  });
  if (!parcel) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Apply the strip-then-rewrite pipeline to every affection plan note.
  // The serialiser handles BigInts; we attach `notesOriginal` and
  // overwrite `notes` per plan in place before serialising. Strip
  // runs first so the rewriter doesn't waste cycles on ZAAHI debug
  // lines that will be discarded anyway.
  const decorated = {
    ...parcel,
    affectionPlans: parcel.affectionPlans.map((p) => ({
      ...p,
      notesOriginal: p.notes,
      notes: rewriteNotes(stripInternalLines(p.notes)),
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

// DELETE /api/parcels/:id  — only the owner.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // CLAUDE.md "NEVER delete parcels — ever" — this handler is kept
  // defensively intact. Same LOCK-8 gating as PATCH so the rule is
  // consistent if a future surface ever invokes DELETE.
  const { id } = await params;
  const existing = await prisma.parcel.findUnique({
    where: { id },
    select: { ownerId: true, verifiedOwnerUserId: true },
  });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.ownerId !== userId && existing.verifiedOwnerUserId !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await prisma.parcel.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
