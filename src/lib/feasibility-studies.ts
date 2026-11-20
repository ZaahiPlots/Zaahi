// ZAAHI Feasibility v6.1 — saved studies: the server half (Prisma).
//
// Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md.
// The rules themselves (who may read, what a body looks like) are pure and
// live in src/lib/feasibility-v6/studyRules.ts; this file only loads rows and
// shapes them.
//
// VERSIONS ARE IMMUTABLE. Nothing here, and no route, calls update / delete /
// upsert on feasibilityStudyVersion. The only write is the `create` in
// POST /api/me/feasibility-studies/[id]/versions.

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import {
  DETAIL_VERSIONS_MAX,
  LIST_VERSIONS_PER_STUDY,
  resolveStudyAccess,
  shareUnlocksStudies,
  versionHeadline,
  type ShareLike,
  type StudyAccess,
  type StudyDetailDto,
  type StudySummaryDto,
  type StudyVersionDto,
  type StudyVersionSummaryDto,
  type VaultStudyRefDto,
} from './feasibility-v6/studyRules';
import { IS_FEASIBILITY_V6_ENABLED } from './feasibility-v6/featureFlag';
import type { StudyInputs } from './feasibility-v6/model';
import type { DefaultsSnapshot, PlotSnapshot, StudyOutputs } from './feasibility-v6/study';

// ── Failure mapping ──────────────────────────────────────────────────────

/**
 * True when the two study tables are not there yet (migration
 * 20261120120000_feasibility_studies not applied). P2021 / P2022 are Prisma's
 * codes; the message / 42P01 checks cover the pg driver adapter surfacing the
 * raw Postgres error instead.
 */
export function isStudiesSchemaMissing(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2021' || e.code === 'P2022')) return true;
  const text = e instanceof Error ? e.message : '';
  return /FeasibilityStudy/.test(text) && /does not exist|42P01|42703/.test(text);
}

export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

/**
 * Turn a thrown DB error into a response. Logs the error class / code only —
 * never the message, which can quote row values.
 */
export function studiesFailure(e: unknown, tag: string): NextResponse {
  if (isStudiesSchemaMissing(e)) {
    return NextResponse.json({ error: 'studies_unavailable' }, { status: 503 });
  }
  const code = e instanceof Prisma.PrismaClientKnownRequestError ? e.code : e instanceof Error ? e.name : 'unknown';
  console.error(`[feasibility-studies] ${tag} failed: ${code}`);
  return NextResponse.json({ error: 'internal_error' }, { status: 500 });
}

export const unauthorized = () => NextResponse.json({ error: 'unauthorized' }, { status: 401 });
/** 404, never 403 — do not confirm that someone else's study exists. */
export const notFound = () => NextResponse.json({ error: 'not_found' }, { status: 404 });
export const badRequest = (error: string, issues?: unknown) =>
  NextResponse.json(issues ? { error, issues } : { error }, { status: 400 });

// ── Selects + serialisers ────────────────────────────────────────────────

export const versionSummarySelect = {
  id: true,
  studyId: true,
  version: true,
  name: true,
  mode: true,
  engines: true,
  modelVersion: true,
  defaultsVersion: true,
  createdAt: true,
  // Selected for the headline only; the summary DTO does not carry it.
  outputs: true,
} satisfies Prisma.FeasibilityStudyVersionSelect;

export const versionFullSelect = {
  ...versionSummarySelect,
  notes: true,
  inputs: true,
  defaultsSnapshot: true,
  plotSnapshot: true,
} satisfies Prisma.FeasibilityStudyVersionSelect;

export const studyBaseSelect = {
  id: true,
  ownerId: true,
  name: true,
  plotNumber: true,
  district: true,
  emirate: true,
  parcelId: true,
  vaultEntryId: true,
  latestVersion: true,
  draftUpdatedAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FeasibilityStudySelect;

type VersionSummaryRow = Prisma.FeasibilityStudyVersionGetPayload<{ select: typeof versionSummarySelect }>;
type VersionFullRow = Prisma.FeasibilityStudyVersionGetPayload<{ select: typeof versionFullSelect }>;
type StudyBaseRow = Prisma.FeasibilityStudyGetPayload<{ select: typeof studyBaseSelect }>;

export function toVersionSummary(v: VersionSummaryRow): StudyVersionSummaryDto {
  return {
    id: v.id,
    studyId: v.studyId,
    version: v.version,
    name: v.name,
    mode: v.mode,
    engines: v.engines,
    modelVersion: v.modelVersion,
    defaultsVersion: v.defaultsVersion,
    createdAt: v.createdAt.toISOString(),
    headline: versionHeadline(v.outputs),
  };
}

export function toVersionFull(v: VersionFullRow): StudyVersionDto {
  return {
    ...toVersionSummary(v),
    notes: v.notes,
    inputs: v.inputs as unknown as StudyInputs,
    outputs: v.outputs as unknown as StudyOutputs,
    defaultsSnapshot: v.defaultsSnapshot as unknown as DefaultsSnapshot,
    plotSnapshot: v.plotSnapshot as unknown as PlotSnapshot,
  };
}

/** Everything about a study except its versions. Draft fields vanish for a shared reader. */
function studyCore(s: StudyBaseRow, access: 'owner' | 'shared') {
  const owner = access === 'owner';
  return {
    id: s.id,
    name: s.name,
    plotNumber: s.plotNumber,
    district: s.district,
    emirate: s.emirate,
    parcelId: s.parcelId,
    vaultEntryId: s.vaultEntryId,
    latestVersion: s.latestVersion,
    hasDraft: owner && s.draftUpdatedAt !== null,
    draftUpdatedAt: owner ? s.draftUpdatedAt?.toISOString() ?? null : null,
    archivedAt: s.archivedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    access,
  };
}

export function toStudySummary(
  s: StudyBaseRow & { versions: VersionSummaryRow[] },
  access: 'owner' | 'shared',
): StudySummaryDto {
  const recentVersions = s.versions.map(toVersionSummary);
  return { ...studyCore(s, access), latest: recentVersions[0] ?? null, recentVersions };
}

/** The select a list route uses: base columns + the newest few version summaries. */
export const studyListSelect = {
  ...studyBaseSelect,
  versions: {
    orderBy: { version: 'desc' },
    take: LIST_VERSIONS_PER_STUDY,
    select: versionSummarySelect,
  },
} satisfies Prisma.FeasibilityStudySelect;

// ── Access ───────────────────────────────────────────────────────────────

const shareSelect = {
  vaultEntryId: true,
  ownerId: true,
  recipientUserId: true,
  permission: true,
  revokedAt: true,
  expiresAt: true,
} satisfies Prisma.VaultShareSelect;

/** The caller's shares on the given vault entries (unfiltered — the pure rule decides). */
export async function sharesFor(userId: string, vaultEntryIds: readonly (string | null)[]): Promise<ShareLike[]> {
  const ids = [...new Set(vaultEntryIds.filter((x): x is string => !!x))];
  if (ids.length === 0) return [];
  return prisma.vaultShare.findMany({
    where: { recipientUserId: userId, vaultEntryId: { in: ids } },
    select: shareSelect,
  });
}

/**
 * Load one study for a reader. Returns null when it does not exist OR the
 * caller may not read it — the route answers 404 either way.
 */
export async function loadStudyDetail(
  userId: string,
  id: string,
): Promise<{ detail: StudyDetailDto; access: 'owner' | 'shared' } | null> {
  const row = await prisma.feasibilityStudy.findUnique({
    where: { id },
    select: {
      ...studyBaseSelect,
      draftInputs: true,
      versions: {
        orderBy: { version: 'desc' },
        take: DETAIL_VERSIONS_MAX + 1,
        select: versionFullSelect,
      },
    },
  });
  if (!row) return null;
  const access: StudyAccess =
    row.ownerId === userId ? 'owner' : resolveStudyAccess(userId, row, await sharesFor(userId, [row.vaultEntryId]));
  if (access === 'none') return null;

  const truncated = row.versions.length > DETAIL_VERSIONS_MAX;
  const versions = (truncated ? row.versions.slice(0, DETAIL_VERSIONS_MAX) : row.versions).map(toVersionFull);
  return {
    access,
    detail: {
      ...studyCore(row, access),
      latest: versions[0] ?? null,
      // The draft is the owner's working copy — never sent to a shared reader.
      draftInputs: access === 'owner' ? ((row.draftInputs as unknown as StudyInputs | null) ?? null) : null,
      versions,
      versionsTruncated: truncated,
    },
  };
}

/** Does the caller own this vault entry? */
export async function ownsVaultEntry(userId: string, vaultEntryId: string): Promise<boolean> {
  const e = await prisma.vaultEntry.findUnique({ where: { id: vaultEntryId }, select: { ownerId: true } });
  return !!e && e.ownerId === userId;
}

// ── Vault surfaces (count on the row, list in the panel) ─────────────────
//
// These are called from the EXISTING vault routes, which must keep working
// while the study tables do not exist. So they are separate queries (not a
// relation include on the vault query) and they never throw: any failure is
// "no studies".
//
// They also cost the vault nothing while the feature is off:
//   • v6 flag off (production today) → no query at all
//   • tables missing → after the first failure, no query for a minute, so
//     the vault list does not pay a failing round-trip (and an error log
//     line) on every request while the migration is pending.

const SCHEMA_MISSING_COOLDOWN_MS = 60_000;
let schemaMissingUntil = 0;

function vaultStudiesSkipped(): boolean {
  return !IS_FEASIBILITY_V6_ENABLED || Date.now() < schemaMissingUntil;
}

function noteVaultStudiesFailure(e: unknown, tag: string): void {
  if (isStudiesSchemaMissing(e)) schemaMissingUntil = Date.now() + SCHEMA_MISSING_COOLDOWN_MS;
  else studiesFailure(e, tag);
}

/** Non-archived studies per vault entry, for the caller's own entries. */
export async function studyCountsByVaultEntry(ownerId: string, entryIds: readonly string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (entryIds.length === 0 || vaultStudiesSkipped()) return out;
  try {
    const rows = await prisma.feasibilityStudy.groupBy({
      by: ['vaultEntryId'],
      where: { ownerId, archivedAt: null, vaultEntryId: { in: [...entryIds] } },
      _count: { _all: true },
    });
    for (const r of rows) if (r.vaultEntryId) out.set(r.vaultEntryId, r._count._all);
  } catch (e) {
    noteVaultStudiesFailure(e, 'vault study counts');
  }
  return out;
}

/**
 * Studies attached to one vault entry.
 *   owner     all of the owner's non-archived studies on it
 *   recipient only when the share unlocks studies, and only studies that
 *             have at least one saved version (a draft is private)
 */
export async function studiesForVaultEntry(
  entry: { id: string; ownerId: string },
  reader: { kind: 'owner' } | { kind: 'recipient'; share: Pick<ShareLike, 'permission' | 'revokedAt' | 'expiresAt'> },
): Promise<VaultStudyRefDto[]> {
  if (vaultStudiesSkipped()) return [];
  if (reader.kind === 'recipient' && !shareUnlocksStudies(reader.share)) return [];
  try {
    const rows = await prisma.feasibilityStudy.findMany({
      where: {
        vaultEntryId: entry.id,
        ownerId: entry.ownerId,
        archivedAt: null,
        ...(reader.kind === 'recipient' ? { latestVersion: { gte: 1 } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        latestVersion: true,
        updatedAt: true,
        versions: { orderBy: { version: 'desc' }, take: 1, select: { id: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      latestVersion: r.latestVersion,
      latestVersionId: r.versions[0]?.id ?? null,
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch (e) {
    noteVaultStudiesFailure(e, 'vault study list');
    return [];
  }
}
