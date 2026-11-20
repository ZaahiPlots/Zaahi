// ZAAHI Feasibility v6.1 — one saved study: read + owner update.
//
// GET   /api/me/feasibility-studies/[id]  → { study: StudyDetailDto } | 404
// PATCH /api/me/feasibility-studies/[id]  body: patchStudySchema → { study: StudyMeta }
//
// Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md §API.
//
// GET is readable by the owner, or read-only by the holder of an ACTIVE
// VaultShare (FEASIBILITY / OFFER) on the study's vault entry. A shared
// reader never receives `draftInputs`. PATCH is owner-only.
//
// There is deliberately NO DELETE: a study is archived, never removed, and a
// version row is never updated or deleted by any route.
//
// 404 (not 403) on access denial — same pattern as the vault handlers.

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';
import {
  badRequest,
  loadStudyDetail,
  notFound,
  ownsVaultEntry,
  studiesFailure,
  unauthorized,
} from '@/lib/feasibility-studies';
import { STUDY_ID_RE, patchStudySchema } from '@/lib/feasibility-v6/studyRules';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getApprovedUserId(req);
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!STUDY_ID_RE.test(id)) return notFound();

  try {
    const hit = await loadStudyDetail(userId, id);
    if (!hit) return notFound();
    return NextResponse.json({ study: hit.detail });
  } catch (e) {
    return studiesFailure(e, 'detail');
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getApprovedUserId(req);
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!STUDY_ID_RE.test(id)) return notFound();

  const raw = await req.json().catch(() => null);
  const parsed = patchStudySchema.safeParse(raw);
  if (!parsed.success) return badRequest('validation_failed', parsed.error.issues.slice(0, 5));
  const body = parsed.data;

  try {
    const existing = await prisma.feasibilityStudy.findUnique({ where: { id }, select: { ownerId: true } });
    if (!existing || existing.ownerId !== userId) return notFound();

    const data: Prisma.FeasibilityStudyUncheckedUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.draftInputs !== undefined) {
      data.draftInputs = body.draftInputs as Prisma.InputJsonValue;
      data.draftUpdatedAt = new Date();
    }
    if (body.archived !== undefined) data.archivedAt = body.archived ? new Date() : null;
    if (body.vaultEntryId !== undefined) {
      // Attach only to an entry the caller owns; detach (null) is always allowed.
      if (body.vaultEntryId !== null && !(await ownsVaultEntry(userId, body.vaultEntryId))) {
        return NextResponse.json({ error: 'vault_entry_not_found' }, { status: 404 });
      }
      data.vaultEntryId = body.vaultEntryId;
    }

    const row = await prisma.feasibilityStudy.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        vaultEntryId: true,
        latestVersion: true,
        draftUpdatedAt: true,
        archivedAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({
      study: {
        id: row.id,
        name: row.name,
        vaultEntryId: row.vaultEntryId,
        latestVersion: row.latestVersion,
        draftUpdatedAt: row.draftUpdatedAt?.toISOString() ?? null,
        archivedAt: row.archivedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    return studiesFailure(e, 'patch');
  }
}
