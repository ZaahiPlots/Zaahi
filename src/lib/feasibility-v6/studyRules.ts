// ZAAHI Feasibility v6.1 — saved studies: rules shared by the API and the UI.
//
// Pure. No Prisma, no fetch, no React — so the routes, the client module, the
// pages and scripts/feasibility-studies.test.ts all import the same rules.
// Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md.
//
//   • who may read a study                      resolveStudyAccess
//   • which ids a comparison may carry          parseCompareIds
//   • request bodies                            createStudySchema, …
//   • wire shapes (DTOs)                        StudySummaryDto, …
//   • how a metric / a staleness reads          formatMetric, stalenessOf

import { z } from 'zod';
import type { StudyInputs } from './model';
import type { ParcelInput } from './parcelInput';
import {
  defaultsChanged,
  modelChanged,
  plotChanged,
  studyInputsSchema,
  type Change,
  type CompareMetric,
  type DefaultsSnapshot,
  type PlotSnapshot,
  type StudyOutputs,
} from './study';

// ── Limits ───────────────────────────────────────────────────────────────

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 5;
export const STUDY_NAME_MAX = 120;
export const VERSION_NOTES_MAX = 4000;
export const LIST_LIMIT_DEFAULT = 20;
export const LIST_LIMIT_MAX = 50;
/** Version summaries embedded per study in a list response (newest first). */
export const LIST_VERSIONS_PER_STUDY = 10;
/** Full versions returned by the study detail route (newest first). */
export const DETAIL_VERSIONS_MAX = 100;
/** A study stops issuing versions here; nobody reaches it by hand. */
export const VERSIONS_PER_STUDY_MAX = 1000;

/** cuid (v1 and v2) — what Prisma's @default(cuid()) produces. */
export const STUDY_ID_RE = /^[a-z0-9]{20,36}$/;

export function clampListLimit(raw: string | null | undefined): number {
  const n = Number(raw ?? LIST_LIMIT_DEFAULT);
  if (!Number.isFinite(n)) return LIST_LIMIT_DEFAULT;
  return Math.max(1, Math.min(LIST_LIMIT_MAX, Math.floor(n)));
}

// ── Access ───────────────────────────────────────────────────────────────

/**
 * VaultShare permissions that let the recipient read the studies attached to
 * the shared entry. VIEW does not: a plain share shows the plot, not the
 * owner's numbers.
 */
export const STUDY_SHARE_PERMISSIONS: readonly string[] = ['FEASIBILITY', 'OFFER'];

export type StudyAccess = 'owner' | 'shared' | 'none';

export interface ShareLike {
  vaultEntryId: string;
  /** VaultShare.ownerId — the user who granted the share. */
  ownerId: string;
  recipientUserId: string;
  permission: string;
  revokedAt: Date | string | null;
  expiresAt: Date | string | null;
}

export interface StudyAccessSubject {
  ownerId: string;
  vaultEntryId: string | null;
  archivedAt: Date | string | null;
}

const ms = (d: Date | string): number => (d instanceof Date ? d.getTime() : new Date(d).getTime());

/** Not revoked and not past its expiry (an expiry equal to `now` has lapsed). */
export function shareIsActive(share: Pick<ShareLike, 'revokedAt' | 'expiresAt'>, now: Date = new Date()): boolean {
  if (share.revokedAt !== null) return false;
  if (share.expiresAt !== null) {
    const t = ms(share.expiresAt);
    if (!Number.isFinite(t) || t <= now.getTime()) return false;
  }
  return true;
}

export function shareUnlocksStudies(share: Pick<ShareLike, 'permission' | 'revokedAt' | 'expiresAt'>, now: Date = new Date()): boolean {
  return STUDY_SHARE_PERMISSIONS.includes(share.permission) && shareIsActive(share, now);
}

/**
 * The one access rule for a study.
 *
 *   owner   the caller created it — full read and write
 *   shared  the study is attached to a vault entry on which the caller holds
 *           an ACTIVE share with FEASIBILITY or OFFER, granted by the study's
 *           own owner — read-only, versions only, never the draft
 *   none    everything else; routes answer 404, not 403
 *
 * An archived study is the owner's alone: archiving withdraws it from readers.
 */
export function resolveStudyAccess(
  userId: string,
  study: StudyAccessSubject,
  shares: readonly ShareLike[],
  now: Date = new Date(),
): StudyAccess {
  if (!userId) return 'none';
  if (study.ownerId === userId) return 'owner';
  if (!study.vaultEntryId || study.archivedAt !== null) return 'none';
  const hit = shares.some(
    (s) =>
      s.vaultEntryId === study.vaultEntryId &&
      s.recipientUserId === userId &&
      s.ownerId === study.ownerId &&
      shareUnlocksStudies(s, now),
  );
  return hit ? 'shared' : 'none';
}

// ── Compare ──────────────────────────────────────────────────────────────

export type CompareIdsError = 'too_few' | 'too_many' | 'invalid_id';

/**
 * `?v=a,b,c` → 2–5 distinct version ids, order kept. Duplicates collapse
 * before the count is checked, so "a,a" is one study and is refused.
 */
export function parseCompareIds(raw: string | null | undefined): { ok: true; ids: string[] } | { ok: false; error: CompareIdsError } {
  const parts = (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  // Bound the work before validating each id.
  if (parts.length > COMPARE_MAX * 4) return { ok: false, error: 'too_many' };
  if (parts.some((p) => !STUDY_ID_RE.test(p))) return { ok: false, error: 'invalid_id' };
  const ids = [...new Set(parts)];
  if (ids.length < COMPARE_MIN) return { ok: false, error: 'too_few' };
  if (ids.length > COMPARE_MAX) return { ok: false, error: 'too_many' };
  return { ok: true, ids };
}

export function compareHref(versionIds: readonly string[]): string {
  return `/feasibility/compare?v=${versionIds.join(',')}`;
}

/** Tick / untick a version for comparison; a sixth tick is ignored. */
export function toggleCompareSelection(selected: readonly string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id);
  if (selected.length >= COMPARE_MAX) return [...selected];
  return [...selected, id];
}

// ── Request bodies ───────────────────────────────────────────────────────

const idSchema = z.string().regex(STUDY_ID_RE);
const nameSchema = z.string().trim().min(1).max(STUDY_NAME_MAX);

export const plotIdentitySchema = z.object({
  plotNumber: z.string().trim().min(1).max(64),
  district: z.string().trim().max(160),
  emirate: z.string().trim().max(64),
});

const nullableNum = z.number().finite().min(0).max(1e13).nullable();

export const plotSnapshotSchema = z.object({
  plotNumber: z.string().max(64),
  district: z.string().max(160),
  landUse: z.string().max(512),
  plotAreaSqft: nullableNum,
  far: nullableNum,
  maxGfaSqft: nullableNum,
  listedPriceAed: nullableNum,
  mix: z.string().max(8000),
});

export const createStudySchema = z.object({
  name: nameSchema.optional(),
  // Free strings on purpose: a preview parcel id ("mock-001") or a vault
  // entry the caller does not own is not an error — the link is stored null.
  parcelId: z.string().trim().min(1).max(64).nullable().optional(),
  vaultEntryId: z.string().trim().min(1).max(64).nullable().optional(),
  plot: plotIdentitySchema,
  draftInputs: studyInputsSchema,
});

export const patchStudySchema = z
  .object({
    name: nameSchema.optional(),
    draftInputs: studyInputsSchema.optional(),
    archived: z.boolean().optional(),
    vaultEntryId: idSchema.nullable().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'empty_patch' });

export const createVersionSchema = z.object({
  name: nameSchema,
  notes: z.string().max(VERSION_NOTES_MAX).nullable().optional(),
  inputs: studyInputsSchema,
  plotSnapshot: plotSnapshotSchema,
});

// ── Wire shapes ──────────────────────────────────────────────────────────

/** The few numbers a list row shows, lifted out of the stored outputs. */
export interface VersionHeadline {
  status: 'ok' | 'blocked';
  profitAed: number | null;
  roiPct: number | null;
  irrPct: number | null;
  verdictLabel: string | null;
  verdictTone: string | null;
}

export interface StudyVersionSummaryDto {
  id: string;
  studyId: string;
  version: number;
  name: string;
  mode: string;
  engines: string;
  modelVersion: string;
  defaultsVersion: string;
  createdAt: string;
  headline: VersionHeadline;
}

export interface StudyVersionDto extends StudyVersionSummaryDto {
  notes: string | null;
  inputs: StudyInputs;
  outputs: StudyOutputs;
  defaultsSnapshot: DefaultsSnapshot;
  plotSnapshot: PlotSnapshot;
}

export interface StudySummaryDto {
  id: string;
  name: string;
  plotNumber: string;
  district: string;
  emirate: string;
  parcelId: string | null;
  vaultEntryId: string | null;
  latestVersion: number;
  /** Always false for a shared reader. */
  hasDraft: boolean;
  /** Always null for a shared reader. */
  draftUpdatedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  access: 'owner' | 'shared';
  /** The newest version, or null when only a draft exists. */
  latest: StudyVersionSummaryDto | null;
  /** Newest first, at most LIST_VERSIONS_PER_STUDY. */
  recentVersions: StudyVersionSummaryDto[];
}

export interface StudyDetailDto extends Omit<StudySummaryDto, 'recentVersions'> {
  /** Owner only. Null for a shared reader even when a draft exists. */
  draftInputs: StudyInputs | null;
  /** Newest first, at most DETAIL_VERSIONS_MAX. */
  versions: StudyVersionDto[];
  versionsTruncated: boolean;
}

export interface CompareItemDto {
  access: 'owner' | 'shared';
  study: {
    id: string;
    name: string;
    plotNumber: string;
    district: string;
    emirate: string;
    parcelId: string | null;
    vaultEntryId: string | null;
  };
  version: StudyVersionDto;
}

/** A study as the vault row / side panel lists it. */
export interface VaultStudyRefDto {
  id: string;
  name: string;
  latestVersion: number;
  /** Null when the study has a draft but no saved version yet. */
  latestVersionId: string | null;
  updatedAt: string;
}

const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

/** Tolerant on purpose: `outputs` is stored JSON and may predate a field. */
export function versionHeadline(outputs: unknown): VersionHeadline {
  const o = (outputs && typeof outputs === 'object' ? outputs : {}) as Record<string, unknown>;
  return {
    status: o.status === 'ok' ? 'ok' : 'blocked',
    profitAed: numOrNull(o.profitAed),
    roiPct: numOrNull(o.roiPct),
    irrPct: numOrNull(o.irrPct),
    verdictLabel: strOrNull(o.verdictLabel),
    verdictTone: strOrNull(o.verdictTone),
  };
}

// ── Autosave helpers ─────────────────────────────────────────────────────

/**
 * JSON with object keys sorted, so two StudyInputs with the same content
 * compare equal whatever order their keys were assembled in. Array order is
 * kept — it is meaningful (components, ramp).
 */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(',')}}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const two = (n: number): string => String(n).padStart(2, '0');

/** "Study 20 Nov 2026 14:32" — local time of whoever starts the study. */
export function defaultStudyName(now: Date = new Date()): string {
  return `Study ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()} ${two(now.getHours())}:${two(now.getMinutes())}`;
}

export function defaultVersionName(nextVersion: number): string {
  return `Version ${nextVersion}`;
}

// ── Staleness ────────────────────────────────────────────────────────────

export interface Staleness {
  defaults: Change[];
  plot: Change[];
  model: boolean;
  /** False when no parcel was to hand, so the plot could not be checked. */
  plotChecked: boolean;
  stale: boolean;
}

/**
 * What moved since a version was saved. Pass `parcel` = null when the plot
 * as it stands today is not known (the plot check is then skipped, not
 * passed).
 */
export function stalenessOf(
  version: { defaultsSnapshot: DefaultsSnapshot | null | undefined; plotSnapshot: PlotSnapshot | null | undefined; modelVersion: string | null | undefined },
  parcel: ParcelInput | null,
): Staleness {
  const defaults = defaultsChanged(version.defaultsSnapshot);
  const plot = plotChanged(version.plotSnapshot, parcel);
  const model = modelChanged(version.modelVersion);
  return { defaults, plot, model, plotChecked: parcel !== null, stale: defaults.length > 0 || plot.length > 0 || model };
}

/** One line per thing that changed, for a banner or a PDF footnote. */
export function stalenessLines(s: Staleness): string[] {
  const out: string[] = [];
  if (s.model) out.push('The calculation model has been updated since this was saved.');
  for (const c of s.plot) out.push(`${c.where} · ${c.field}: ${c.was} → ${c.now}`);
  for (const c of s.defaults) out.push(`${c.where} default · ${c.field}: ${c.was} → ${c.now}`);
  return out;
}

// ── Formatting a compared metric ─────────────────────────────────────────

export const MODE_LABELS: Record<string, string> = {
  bts: 'Build to sell',
  btr: 'Build to rent',
  jv: 'Joint venture',
};

const grp = (n: number, d = 0): string => n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
/** Magnitude with a real minus sign — and no "−0.0" for a value that rounds to zero. */
const signed = (n: number, d = 0): string => {
  const mag = grp(Math.abs(n), d);
  return `${n < 0 && /[1-9]/.test(mag) ? '−' : ''}${mag}`;
};

/** A metric cell as text. "—" when the study has no value for it. */
export function formatMetric(metric: CompareMetric, outputs: StudyOutputs): string {
  const v = outputs[metric.key];
  if (metric.format === 'text') {
    if (typeof v !== 'string' || v.length === 0) return '—';
    return metric.key === 'mode' ? MODE_LABELS[v] ?? v : v;
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  switch (metric.format) {
    case 'aed': {
      const mag = grp(Math.round(Math.abs(v)));
      return `${v < 0 && mag !== '0' ? '−' : ''}AED ${mag}`;
    }
    case 'psf':
      return `AED ${signed(Math.round(v))}/sqft`;
    case 'pct':
      return `${signed(v, 1)}%`;
    case 'x':
      return `${signed(v, 2)}×`;
    case 'int':
    case 'months':
      return signed(Math.round(v));
  }
}
