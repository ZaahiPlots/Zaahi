// ZAAHI Feasibility v6.1 — load 2–5 saved versions for side-by-side compare.
//
// GET /api/me/feasibility-studies/compare?v=<versionId>,<versionId>,…
//     → { items: CompareItemDto[] }   (in the order asked for)
//
// Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md §API.
//
// Every id must be a version the caller may read — their own, or one shared
// through an active FEASIBILITY / OFFER VaultShare (resolveStudyAccess). If
// ANY id is unknown or unreadable the whole request is 404: answering for
// the readable subset would reveal which of the others exist.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';
import {
  badRequest,
  notFound,
  sharesFor,
  studiesFailure,
  toVersionFull,
  unauthorized,
  versionFullSelect,
} from '@/lib/feasibility-studies';
import { parseCompareIds, resolveStudyAccess, type CompareItemDto } from '@/lib/feasibility-v6/studyRules';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return unauthorized();

  const parsed = parseCompareIds(new URL(req.url).searchParams.get('v'));
  if (!parsed.ok) return badRequest(parsed.error);
  const ids = parsed.ids;

  try {
    const rows = await prisma.feasibilityStudyVersion.findMany({
      where: { id: { in: ids } },
      select: {
        ...versionFullSelect,
        study: {
          select: {
            id: true,
            ownerId: true,
            name: true,
            plotNumber: true,
            district: true,
            emirate: true,
            parcelId: true,
            vaultEntryId: true,
            archivedAt: true,
          },
        },
      },
    });
    if (rows.length !== ids.length) return notFound();

    const foreign = rows.filter((r) => r.study.ownerId !== userId);
    const shares = foreign.length > 0 ? await sharesFor(userId, foreign.map((r) => r.study.vaultEntryId)) : [];

    const byId = new Map(rows.map((r) => [r.id, r]));
    const items: CompareItemDto[] = [];
    for (const id of ids) {
      const r = byId.get(id);
      if (!r) return notFound();
      const access = resolveStudyAccess(userId, r.study, shares);
      if (access === 'none') return notFound();
      const { study, ...version } = r;
      items.push({
        access,
        study: {
          id: study.id,
          name: study.name,
          plotNumber: study.plotNumber,
          district: study.district,
          emirate: study.emirate,
          parcelId: study.parcelId,
          vaultEntryId: study.vaultEntryId,
        },
        version: toVersionFull(version),
      });
    }
    return NextResponse.json({ items });
  } catch (e) {
    return studiesFailure(e, 'compare');
  }
}
