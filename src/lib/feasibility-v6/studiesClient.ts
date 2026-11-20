'use client';

// ZAAHI Feasibility v6.1 — saved studies: typed browser client.
//
// Thin wrappers over /api/me/feasibility-studies/** through `apiFetch`, which
// attaches the Supabase bearer token (.claude/rules/security.md).
// Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md §API.
//
// Nothing here throws. Every call resolves to an ApiResult, so a caller that
// forgets a try/catch still cannot take the calculator down — and "the
// tables are not there yet" (503 studies_unavailable) is an ordinary value
// the UI can branch on.

import { apiFetch } from '@/lib/api-fetch';
import type { StudyInputs } from './model';
import type { PlotSnapshot } from './study';
import type { CompareItemDto, StudyDetailDto, StudySummaryDto, StudyVersionDto } from './studyRules';

export type {
  CompareItemDto,
  StudyDetailDto,
  StudySummaryDto,
  StudyVersionDto,
  StudyVersionSummaryDto,
  VaultStudyRefDto,
  VersionHeadline,
} from './studyRules';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; code: string };

const BASE = '/api/me/feasibility-studies';

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<ApiResult<T>> {
  try {
    const res = await apiFetch(path, {
      method: init?.method ?? 'GET',
      ...(init?.body !== undefined
        ? { body: JSON.stringify(init.body), headers: { 'Content-Type': 'application/json' } }
        : {}),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const code =
        json && typeof json === 'object' && typeof (json as { error?: unknown }).error === 'string'
          ? (json as { error: string }).error
          : `http_${res.status}`;
      return { ok: false, status: res.status, code };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 0, code: 'network' };
  }
}

/** The study tables are not deployed yet (migration pending). Stop asking. */
export function isStudiesUnavailable(r: ApiResult<unknown>): boolean {
  return !r.ok && r.code === 'studies_unavailable';
}

/** A sentence for the failure, safe to show a user. */
export function describeStudiesError(r: { status: number; code: string }): string {
  switch (r.code) {
    case 'studies_unavailable':
      return 'Saved studies are not switched on yet.';
    case 'network':
      return 'No connection.';
    case 'unauthorized':
      return 'Your session has ended — sign in again.';
    case 'not_found':
      return 'That study is no longer available.';
    case 'validation_failed':
    case 'invalid_inputs':
      return 'Some inputs are outside the range that can be saved.';
    case 'compute_failed':
      return 'These inputs could not be calculated, so no version was saved.';
    case 'version_conflict':
      return 'Another save was in progress — try again.';
    case 'version_limit':
      return 'This study has reached its version limit. Start a new study.';
    case 'vault_entry_not_found':
      return 'That vault entry is not yours to attach to.';
    case 'too_few':
      return 'Pick at least two versions to compare.';
    case 'too_many':
      return 'Compare at most five versions at a time.';
    case 'invalid_id':
      return 'That comparison link is not valid.';
    default:
      return `Something went wrong (${r.status || 'offline'}).`;
  }
}

export interface ListStudiesParams {
  plotNumber?: string | null;
  parcelId?: string | null;
  vaultEntryId?: string | null;
  archived?: 'only' | 'include';
  cursor?: string | null;
  limit?: number;
}

export interface ListStudiesResponse {
  items: StudySummaryDto[];
  /** Read-only studies shared through `vaultEntryId`. Empty unless that filter is set. */
  shared: StudySummaryDto[];
  /** Whether the `vaultEntryId` filter names the caller's own entry. null when no filter (or not the first page). */
  vaultEntryOwned: boolean | null;
  nextCursor: string | null;
}

export function listStudies(p: ListStudiesParams = {}): Promise<ApiResult<ListStudiesResponse>> {
  const q = new URLSearchParams();
  if (p.plotNumber) q.set('plotNumber', p.plotNumber);
  if (p.parcelId) q.set('parcelId', p.parcelId);
  if (p.vaultEntryId) q.set('vaultEntryId', p.vaultEntryId);
  if (p.archived) q.set('archived', p.archived);
  if (p.cursor) q.set('cursor', p.cursor);
  if (p.limit) q.set('limit', String(p.limit));
  const qs = q.toString();
  return call<ListStudiesResponse>(qs ? `${BASE}?${qs}` : BASE);
}

export interface CreateStudyBody {
  name?: string;
  parcelId?: string | null;
  vaultEntryId?: string | null;
  plot: { plotNumber: string; district: string; emirate: string };
  draftInputs: StudyInputs;
}

export function createStudy(body: CreateStudyBody): Promise<ApiResult<{ study: StudySummaryDto }>> {
  return call(BASE, { method: 'POST', body });
}

export function getStudy(id: string): Promise<ApiResult<{ study: StudyDetailDto }>> {
  return call(`${BASE}/${encodeURIComponent(id)}`);
}

export interface PatchStudyBody {
  name?: string;
  draftInputs?: StudyInputs;
  archived?: boolean;
  vaultEntryId?: string | null;
}

export interface StudyMeta {
  id: string;
  name: string;
  vaultEntryId: string | null;
  latestVersion: number;
  draftUpdatedAt: string | null;
  archivedAt: string | null;
  updatedAt: string;
}

export function patchStudy(id: string, body: PatchStudyBody): Promise<ApiResult<{ study: StudyMeta }>> {
  return call(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}

export interface SaveVersionBody {
  name: string;
  notes?: string | null;
  inputs: StudyInputs;
  plotSnapshot: PlotSnapshot;
}

export function saveVersion(studyId: string, body: SaveVersionBody): Promise<ApiResult<{ version: StudyVersionDto }>> {
  return call(`${BASE}/${encodeURIComponent(studyId)}/versions`, { method: 'POST', body });
}

export function compareVersions(versionIds: readonly string[]): Promise<ApiResult<{ items: CompareItemDto[] }>> {
  return call(`${BASE}/compare?v=${versionIds.map(encodeURIComponent).join(',')}`);
}
