'use client';

// ZAAHI Feasibility v6.1 — "My studies": paginated, grouped by plot.
// Tick 2–5 versions → Compare. Rename / archive a study. A version has no
// edit or delete control anywhere: versions are immutable.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COMPARE_MAX,
  COMPARE_MIN,
  STUDY_NAME_MAX,
  compareHref,
  toggleCompareSelection,
} from '@/lib/feasibility-v6/studyRules';
import {
  describeStudiesError,
  getStudy,
  isStudiesUnavailable,
  listStudies,
  patchStudy,
  type StudySummaryDto,
  type StudyVersionSummaryDto,
} from '@/lib/feasibility-v6/studiesClient';
import { BG_GRADIENT } from '@/lib/design-tokens';
import { DIM, GOLD, LINE, SUBTLE, TXT } from '@/components/feasibility/ui';
import {
  BODY_FONT,
  Btn,
  Check,
  Field,
  HeadlineText,
  Notice,
  SERIF,
  StudiesKeyframes,
  fmtDate,
  fmtDateTime,
  glassCard,
} from '@/components/feasibility/studiesUi';

const PAGE_SIZE = 20;

type LoadState = 'loading' | 'ready' | 'error' | 'unavailable';

interface PlotGroup {
  key: string;
  plotNumber: string;
  district: string;
  emirate: string;
  studies: StudySummaryDto[];
}

/** Group in the order studies arrive (newest first), so the freshest plot leads. */
function groupByPlot(items: StudySummaryDto[]): PlotGroup[] {
  const map = new Map<string, PlotGroup>();
  for (const s of items) {
    const key = `${s.emirate}|${s.district}|${s.plotNumber}`;
    const g = map.get(key);
    if (g) g.studies.push(s);
    else map.set(key, { key, plotNumber: s.plotNumber, district: s.district, emirate: s.emirate, studies: [s] });
  }
  return [...map.values()];
}

export default function StudiesPageClient() {
  const [items, setItems] = useState<StudySummaryDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; text: string } | null>(null);
  // Guards against a slow first page landing after the filter was switched.
  const generation = useRef(0);

  const load = useCallback(async (archived: boolean) => {
    const gen = ++generation.current;
    setState('loading');
    setError(null);
    const r = await listStudies({ limit: PAGE_SIZE, ...(archived ? { archived: 'include' as const } : {}) });
    if (gen !== generation.current) return;
    if (r.ok) {
      setItems(r.data.items);
      setNextCursor(r.data.nextCursor);
      setState('ready');
    } else if (isStudiesUnavailable(r)) {
      setState('unavailable');
    } else {
      setError(describeStudiesError(r));
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load(showArchived);
  }, [load, showArchived]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const gen = generation.current;
    setLoadingMore(true);
    const r = await listStudies({ limit: PAGE_SIZE, cursor: nextCursor, ...(showArchived ? { archived: 'include' as const } : {}) });
    if (gen !== generation.current) return;
    setLoadingMore(false);
    if (r.ok) {
      setItems((cur) => [...cur, ...r.data.items.filter((x) => !cur.some((c) => c.id === x.id))]);
      setNextCursor(r.data.nextCursor);
    } else {
      setError(describeStudiesError(r));
    }
  }, [nextCursor, loadingMore, showArchived]);

  const groups = useMemo(() => groupByPlot(items), [items]);

  const saveName = useCallback(async () => {
    if (!renaming) return;
    const name = renaming.value.trim();
    if (!name) return;
    setBusy(renaming.id);
    setRowError(null);
    const r = await patchStudy(renaming.id, { name });
    setBusy(null);
    if (!r.ok) {
      setRowError({ id: renaming.id, text: describeStudiesError(r) });
      return;
    }
    setItems((cur) => cur.map((s) => (s.id === renaming.id ? { ...s, name: r.data.study.name } : s)));
    setRenaming(null);
  }, [renaming]);

  const setArchived = useCallback(
    async (study: StudySummaryDto, archived: boolean) => {
      setBusy(study.id);
      setRowError(null);
      const r = await patchStudy(study.id, { archived });
      setBusy(null);
      if (!r.ok) {
        setRowError({ id: study.id, text: describeStudiesError(r) });
        return;
      }
      if (archived) {
        // Its versions can no longer be ticked once it leaves the list.
        const gone = new Set(study.recentVersions.map((v) => v.id));
        setSelected((sel) => sel.filter((id) => !gone.has(id)));
      }
      setItems((cur) =>
        archived && !showArchived
          ? cur.filter((s) => s.id !== study.id)
          : cur.map((s) => (s.id === study.id ? { ...s, archivedAt: r.data.study.archivedAt } : s)),
      );
    },
    [showArchived],
  );

  const showAllVersions = useCallback(async (study: StudySummaryDto) => {
    setBusy(study.id);
    setRowError(null);
    const r = await getStudy(study.id);
    setBusy(null);
    if (!r.ok) {
      setRowError({ id: study.id, text: describeStudiesError(r) });
      return;
    }
    const all: StudyVersionSummaryDto[] = r.data.study.versions.map((v) => ({
      id: v.id,
      studyId: v.studyId,
      version: v.version,
      name: v.name,
      mode: v.mode,
      engines: v.engines,
      modelVersion: v.modelVersion,
      defaultsVersion: v.defaultsVersion,
      createdAt: v.createdAt,
      headline: v.headline,
    }));
    setItems((cur) => cur.map((s) => (s.id === study.id ? { ...s, recentVersions: all } : s)));
  }, []);

  const canCompare = selected.length >= COMPARE_MIN && selected.length <= COMPARE_MAX;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG_GRADIENT,
        color: TXT,
        fontFamily: BODY_FONT,
        fontSize: 12,
      }}
    >
      <StudiesKeyframes />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 120px' }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ color: SUBTLE, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Feasibility</div>
            <h1 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, margin: '2px 0 0', letterSpacing: '-0.01em' }}>My studies</h1>
            <div style={{ color: DIM, marginTop: 4, maxWidth: 560, lineHeight: 1.5 }}>
              Every calculation you have worked on, by plot. A draft saves itself as you type; a version is a permanent snapshot.
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: DIM, fontSize: 11 }}>
              <Check checked={showArchived} onChange={setShowArchived} label="Show archived studies" />
              <span onClick={() => setShowArchived((v) => !v)} style={{ cursor: 'pointer' }}>
                Show archived
              </span>
            </div>
            <Btn tone="quiet" href="/parcels/map">
              Back to map
            </Btn>
          </div>
        </header>

        {state === 'loading' && <div style={{ ...glassCard, padding: 16, color: SUBTLE }}>Loading your studies…</div>}

        {state === 'unavailable' && (
          <Notice tone="info">
            Saved studies are not switched on yet. Nothing is wrong with your account — the feature is waiting on a database update.
          </Notice>
        )}

        {state === 'error' && (
          <Notice tone="error">
            <div>Your studies could not be loaded. {error}</div>
            <div style={{ marginTop: 6 }}>
              <Btn small onClick={() => void load(showArchived)}>
                Retry
              </Btn>
            </div>
          </Notice>
        )}

        {state === 'ready' && items.length === 0 && (
          <div style={{ ...glassCard, padding: 20 }}>
            <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700 }}>No studies yet</div>
            <div style={{ color: DIM, marginTop: 6, lineHeight: 1.5, maxWidth: 520 }}>
              Open a plot on the map, open its Feasibility Calculator and change any input. The calculation is saved here automatically.
            </div>
            <div style={{ marginTop: 12 }}>
              <Btn href="/parcels/map">Open the map</Btn>
            </div>
          </div>
        )}

        {state === 'ready' &&
          groups.map((g) => (
            <section key={g.key} style={{ ...glassCard, padding: '14px 16px', marginBottom: 14, animation: 'zaahiStudiesFade 200ms ease-in-out' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, paddingBottom: 8, borderBottom: `1px solid ${LINE}` }}>
                <h2 style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, margin: 0, color: GOLD, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Plot {g.plotNumber}
                </h2>
                <span style={{ color: SUBTLE, fontSize: 11 }}>
                  {[g.district, g.emirate].filter(Boolean).join(' · ')} · {g.studies.length} stud{g.studies.length === 1 ? 'y' : 'ies'}
                </span>
              </div>

              {g.studies.map((s) => {
                const isRenaming = renaming?.id === s.id;
                const hidden = s.latestVersion - s.recentVersions.length;
                return (
                  <div key={s.id} style={{ padding: '12px 0', borderBottom: `1px solid ${LINE}`, opacity: s.archivedAt ? 0.6 : 1, transition: 'opacity 150ms ease' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0, flex: '1 1 240px' }}>
                        {isRenaming ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', maxWidth: 420 }}>
                            <Field
                              value={renaming.value}
                              onChange={(v) => setRenaming({ id: s.id, value: v })}
                              maxLength={STUDY_NAME_MAX}
                              ariaLabel="Study name"
                              autoFocus
                              onEnter={() => void saveName()}
                            />
                            <Btn small onClick={() => void saveName()} disabled={busy === s.id || renaming.value.trim().length === 0}>
                              Save
                            </Btn>
                            <Btn small tone="quiet" onClick={() => setRenaming(null)}>
                              Cancel
                            </Btn>
                          </div>
                        ) : (
                          <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.name}
                            {s.archivedAt && <span style={{ color: SUBTLE, fontSize: 10, fontWeight: 400, marginLeft: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Archived</span>}
                          </div>
                        )}
                        <div style={{ color: SUBTLE, fontSize: 11, marginTop: 2 }}>
                          {s.latestVersion} version{s.latestVersion === 1 ? '' : 's'}
                          {s.draftUpdatedAt ? ` · draft saved ${fmtDateTime(s.draftUpdatedAt)}` : ''}
                          {s.vaultEntryId ? ' · attached to a vault entry' : ''}
                        </div>
                      </div>
                      {!isRenaming && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {s.parcelId && (
                            <Btn small tone="quiet" href={`/parcels/${s.parcelId}/feasibility`} title="Open this plot in the calculator; the study is listed in its Studies bar">
                              Open calculator
                            </Btn>
                          )}
                          <Btn small tone="quiet" onClick={() => setRenaming({ id: s.id, value: s.name })} disabled={busy === s.id}>
                            Rename
                          </Btn>
                          <Btn small tone="quiet" onClick={() => void setArchived(s, !s.archivedAt)} disabled={busy === s.id}>
                            {s.archivedAt ? 'Restore' : 'Archive'}
                          </Btn>
                        </div>
                      )}
                    </div>

                    {rowError?.id === s.id && (
                      <div style={{ marginTop: 8 }}>
                        <Notice tone="error">{rowError.text}</Notice>
                      </div>
                    )}

                    <div style={{ marginTop: 8 }}>
                      {s.recentVersions.length === 0 ? (
                        <div style={{ color: SUBTLE, fontSize: 11 }}>Draft only — no version saved yet, so there is nothing to compare.</div>
                      ) : (
                        s.recentVersions.map((v) => {
                          const isSel = selected.includes(v.id);
                          return (
                            <div
                              key={v.id}
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: 10,
                                padding: '6px 8px',
                                borderRadius: 6,
                                background: isSel ? 'rgba(200, 169, 110, 0.08)' : 'transparent',
                                transition: 'background 150ms ease',
                              }}
                            >
                              <Check
                                checked={isSel}
                                disabled={!isSel && selected.length >= COMPARE_MAX}
                                onChange={() => setSelected((sel) => toggleCompareSelection(sel, v.id))}
                                label={`Compare version ${v.version} of ${s.name}`}
                              />
                              <span style={{ flex: '1 1 180px', minWidth: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ color: GOLD }}>v{v.version}</span> {v.name}
                              </span>
                              <span style={{ flex: '1 1 150px', color: DIM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.engines}</span>
                              <span style={{ flex: '1 1 200px' }}>
                                <HeadlineText h={v.headline} />
                              </span>
                              <span style={{ color: SUBTLE, whiteSpace: 'nowrap' }}>{fmtDate(v.createdAt)}</span>
                            </div>
                          );
                        })
                      )}
                      {hidden > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <Btn small tone="quiet" onClick={() => void showAllVersions(s)} disabled={busy === s.id}>
                            Show {hidden} older version{hidden === 1 ? '' : 's'}
                          </Btn>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}

        {state === 'ready' && error && (
          <div style={{ marginBottom: 12 }}>
            <Notice tone="error">More studies could not be loaded. {error}</Notice>
          </div>
        )}

        {state === 'ready' && nextCursor && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <Btn onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more studies'}
            </Btn>
          </div>
        )}
      </div>

      {/* Compare tray — slides in once something is ticked. */}
      <div
        aria-hidden={selected.length === 0}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '0 16px 16px',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: selected.length === 0 ? 'none' : 'auto',
          opacity: selected.length === 0 ? 0 : 1,
          transform: selected.length === 0 ? 'translateY(12px)' : 'translateY(0)',
          transition: 'opacity 200ms ease-in-out, transform 200ms ease-in-out',
        }}
      >
        <div
          style={{
            ...glassCard,
            background: 'rgba(10, 22, 40, 0.92)',
            padding: '10px 14px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            maxWidth: 640,
            width: '100%',
          }}
        >
          <span style={{ flex: 1, minWidth: 160, color: DIM }}>
            <span style={{ color: TXT, fontWeight: 800, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{selected.length}</span> of {COMPARE_MAX} selected
            {selected.length < COMPARE_MIN ? ` — tick at least ${COMPARE_MIN}` : ''}
          </span>
          <Btn tone="quiet" onClick={() => setSelected([])} disabled={selected.length === 0}>
            Clear
          </Btn>
          <Btn href={canCompare ? compareHref(selected) : undefined} disabled={!canCompare}>
            Compare
          </Btn>
        </div>
      </div>
    </div>
  );
}
