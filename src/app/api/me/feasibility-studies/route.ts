// ZAAHI Feasibility v6.1 — saved studies: list + create.
//
// GET  /api/me/feasibility-studies ?plotNumber&parcelId&vaultEntryId&archived&cursor&limit
// POST /api/me/feasibility-studies  body: createStudySchema
//
// Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md §API.
// Auth: getApprovedUserId. The list is the caller's OWN studies; the only
// other rows it can return are in `shared`, and only when `vaultEntryId`
// names an entry on which the caller holds an active FEASIBILITY / OFFER
// share (same rule as the detail route — resolveStudyAccess).

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';
import {
  badRequest,
  ownsVaultEntry,
  sharesFor,
  studiesFailure,
  studyListSelect,
  toStudySummary,
  unauthorized,
} from '@/lib/feasibility-studies';
import {
  STUDY_ID_RE,
  clampListLimit,
  createStudySchema,
  defaultStudyName,
  resolveStudyAccess,
  type StudySummaryDto,
} from '@/lib/feasibility-v6/studyRules';

export const runtime = 'nodejs';

/** Studies a shared reader is shown for one vault entry. Bounded, not paginated. */
const SHARED_LIMIT = 20;

export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return unauthorized();

  const q = new URL(req.url).searchParams;
  const plotNumber = q.get('plotNumber')?.trim().slice(0, 64) || null;
  const parcelId = q.get('parcelId')?.trim().slice(0, 64) || null;
  const vaultEntryIdRaw = q.get('vaultEntryId')?.trim() || null;
  const vaultEntryId = vaultEntryIdRaw && STUDY_ID_RE.test(vaultEntryIdRaw) ? vaultEntryIdRaw : null;
  const archived = q.get('archived'); // null = active only | "only" | "include"
  const cursorRaw = q.get('cursor');
  const cursor = cursorRaw && STUDY_ID_RE.test(cursorRaw) ? cursorRaw : null;
  const limit = clampListLimit(q.get('limit'));

  // The plot filters are alternatives: a study belongs to "this plot" if it
  // matches the plot number OR is linked to the parcel OR to the vault entry.
  const plotOr: Prisma.FeasibilityStudyWhereInput[] = [];
  if (plotNumber) plotOr.push({ plotNumber });
  if (parcelId) plotOr.push({ parcelId });
  if (vaultEntryId) plotOr.push({ vaultEntryId });

  const where: Prisma.FeasibilityStudyWhereInput = {
    ownerId: userId,
    ...(archived === 'only' ? { archivedAt: { not: null } } : archived === 'include' ? {} : { archivedAt: null }),
    ...(plotOr.length > 0 ? { OR: plotOr } : {}),
  };

  try {
    // limit + 1 to detect "more" without a count query.
    const rowsRaw = await prisma.feasibilityStudy.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: studyListSelect,
    });
    const hasMore = rowsRaw.length > limit;
    const rows = hasMore ? rowsRaw.slice(0, limit) : rowsRaw;
    const items: StudySummaryDto[] = rows.map((r) => toStudySummary(r, 'owner'));

    // First page only: is the named vault entry the caller's own (so the UI
    // may offer attach / detach), and if not, which studies does a share on
    // it let them read.
    let shared: StudySummaryDto[] = [];
    let vaultEntryOwned: boolean | null = null;
    if (vaultEntryId && !cursor) {
      vaultEntryOwned = await ownsVaultEntry(userId, vaultEntryId);
      const shares = vaultEntryOwned ? [] : await sharesFor(userId, [vaultEntryId]);
      if (shares.length > 0) {
        const sharedRows = await prisma.feasibilityStudy.findMany({
          where: { vaultEntryId, ownerId: { not: userId }, archivedAt: null, latestVersion: { gte: 1 } },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: SHARED_LIMIT,
          select: studyListSelect,
        });
        shared = sharedRows
          .filter((r) => resolveStudyAccess(userId, r, shares) === 'shared')
          .map((r) => toStudySummary(r, 'shared'));
      }
    }

    return NextResponse.json({
      items,
      shared,
      vaultEntryOwned,
      nextCursor: hasMore ? rows[rows.length - 1].id : null,
    });
  } catch (e) {
    return studiesFailure(e, 'list');
  }
}

export async function POST(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return unauthorized();

  const raw = await req.json().catch(() => null);
  const parsed = createStudySchema.safeParse(raw);
  if (!parsed.success) return badRequest('validation_failed', parsed.error.issues.slice(0, 5));
  const body = parsed.data;

  try {
    // Links are best-effort: a preview parcel id ("mock-001") has no Parcel
    // row, and a share recipient's panel carries a vault entry they do not
    // own. Neither is a reason to refuse the save — the link is stored null
    // and the denormalised plot identity carries the study.
    let parcelId: string | null = null;
    if (body.parcelId) {
      const p = await prisma.parcel.findUnique({ where: { id: body.parcelId }, select: { id: true } });
      parcelId = p?.id ?? null;
    }
    let vaultEntryId: string | null = null;
    if (body.vaultEntryId && STUDY_ID_RE.test(body.vaultEntryId) && (await ownsVaultEntry(userId, body.vaultEntryId))) {
      vaultEntryId = body.vaultEntryId;
    }

    const now = new Date();
    const row = await prisma.feasibilityStudy.create({
      data: {
        ownerId: userId,
        parcelId,
        vaultEntryId,
        plotNumber: body.plot.plotNumber,
        district: body.plot.district,
        emirate: body.plot.emirate,
        name: body.name ?? defaultStudyName(now),
        draftInputs: body.draftInputs as Prisma.InputJsonValue,
        draftUpdatedAt: now,
      },
      select: studyListSelect,
    });
    return NextResponse.json({ study: toStudySummary(row, 'owner') }, { status: 201 });
  } catch (e) {
    return studiesFailure(e, 'create');
  }
}
