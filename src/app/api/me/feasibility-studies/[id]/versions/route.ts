// ZAAHI Feasibility v6.1 — save an immutable version of a study.
//
// POST /api/me/feasibility-studies/[id]/versions
//      body: { name, notes?, inputs, plotSnapshot } → 201 { version: StudyVersionDto }
//
// Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md §API.
// Owner-only.
//
// The body carries NO numbers the server stores as results. `outputs` is
// recomputed here from the validated inputs (CLAUDE.md: financial
// calculations server-side only), and the defaults snapshot is taken here
// too. The plot snapshot is the one thing accepted from the client, because
// the plot may have no Parcel row to read it from (vault entry, preview);
// it is validated and is only ever compared for display, never calculated on.
//
// This is the ONLY write to FeasibilityStudyVersion in the codebase, and it
// is an INSERT. There is no PATCH and no DELETE on this route by design.

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getApprovedUserId } from '@/lib/auth';
import {
  badRequest,
  isUniqueViolation,
  notFound,
  studiesFailure,
  toVersionFull,
  unauthorized,
  versionFullSelect,
} from '@/lib/feasibility-studies';
import { STUDY_ID_RE, VERSIONS_PER_STUDY_MAX, createVersionSchema } from '@/lib/feasibility-v6/studyRules';
import { computeOutputs, parseStudyInputs, snapshotDefaultsFor } from '@/lib/feasibility-v6/study';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getApprovedUserId(req);
  if (!userId) return unauthorized();

  const { id } = await params;
  if (!STUDY_ID_RE.test(id)) return notFound();

  const raw = await req.json().catch(() => null);
  const parsed = createVersionSchema.safeParse(raw);
  if (!parsed.success) return badRequest('validation_failed', parsed.error.issues.slice(0, 5));
  const body = parsed.data;

  // The contract's own validator, on the raw value — the schema above already
  // implies it, but this is the function the model's author maintains.
  const inputs = parseStudyInputs((raw as { inputs?: unknown } | null)?.inputs);
  if (!inputs) return badRequest('invalid_inputs');

  let outputs;
  let defaultsSnapshot;
  try {
    outputs = computeOutputs(inputs);
    defaultsSnapshot = snapshotDefaultsFor(inputs);
  } catch {
    // Inputs that validate but the model cannot evaluate. Nothing is stored.
    return NextResponse.json({ error: 'compute_failed' }, { status: 422 });
  }

  try {
    const existing = await prisma.feasibilityStudy.findUnique({
      where: { id },
      select: { ownerId: true, latestVersion: true },
    });
    if (!existing || existing.ownerId !== userId) return notFound();
    if (existing.latestVersion >= VERSIONS_PER_STUDY_MAX) {
      return NextResponse.json({ error: 'version_limit' }, { status: 409 });
    }

    const notes = body.notes?.trim() ? body.notes.trim() : null;
    const now = new Date();

    // The UPDATE takes the study's row lock, so two concurrent saves queue up
    // and each reads its own incremented number. @@unique([studyId, version])
    // is the backstop: if anything ever issued the same number twice, the
    // second INSERT fails and the whole transaction rolls back.
    const row = await prisma.$transaction(async (tx) => {
      const bumped = await tx.feasibilityStudy.update({
        where: { id },
        data: {
          latestVersion: { increment: 1 },
          // The saved inputs become the working copy.
          draftInputs: inputs as unknown as Prisma.InputJsonValue,
          draftUpdatedAt: now,
        },
        select: { latestVersion: true },
      });
      return tx.feasibilityStudyVersion.create({
        data: {
          studyId: id,
          version: bumped.latestVersion,
          name: body.name,
          notes,
          mode: inputs.mode,
          engines: outputs.engines,
          inputs: inputs as unknown as Prisma.InputJsonValue,
          outputs: outputs as unknown as Prisma.InputJsonValue,
          defaultsSnapshot: defaultsSnapshot as unknown as Prisma.InputJsonValue,
          plotSnapshot: body.plotSnapshot as Prisma.InputJsonValue,
          modelVersion: outputs.modelVersion,
          defaultsVersion: outputs.defaultsVersion,
          createdByUserId: userId,
        },
        select: versionFullSelect,
      });
    });

    return NextResponse.json({ version: toVersionFull(row) }, { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e)) return NextResponse.json({ error: 'version_conflict' }, { status: 409 });
    return studiesFailure(e, 'save version');
  }
}
