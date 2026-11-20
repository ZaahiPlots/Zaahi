'use client';

// ZAAHI Feasibility v6.1 — 2–5 saved versions side by side.
//
//   results      COMPARE_METRICS, best value per row highlighted (bestIndex)
//   assumptions  assumptionRows, differing rows marked, "only differences"
//   staleness    per column: defaults / plot facts / model moved since saved
//   export       one landscape PDF (comparePdf.ts, on pdfKit)
//
// Every figure shown is the version's SAVED output — nothing is recalculated
// here, so a column reads the same today as on the day it was saved.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { BG_GRADIENT } from '@/lib/design-tokens';
import { adaptSidePanelToInput, type ParcelInput } from '@/lib/feasibility-v6/parcelInput';
import { COMPARE_METRICS, assumptionRows, bestIndex } from '@/lib/feasibility-v6/study';
import {
  COMPARE_MAX,
  COMPARE_MIN,
  formatMetric,
  parseCompareIds,
  stalenessLines,
  stalenessOf,
  type CompareItemDto,
  type Staleness,
} from '@/lib/feasibility-v6/studyRules';
import { compareVersions, describeStudiesError, isStudiesUnavailable } from '@/lib/feasibility-v6/studiesClient';
import { AMBER, DIM, GOLD, LINE, LINE_HARD, SUBTLE, TXT } from '@/components/feasibility/ui';
import {
  BODY_FONT,
  Btn,
  Check,
  GREEN,
  GREEN_WASH,
  Notice,
  SERIF,
  StudiesKeyframes,
  VerdictPill,
  fmtDate,
  glassCard,
} from '@/components/feasibility/studiesUi';

type LoadState = 'loading' | 'ready' | 'error' | 'unavailable' | 'invalid';

const letter = (i: number): string => String.fromCharCode(65 + i);

/** The plot as it stands today, through the same adapter the side panel uses. */
async function fetchParcelInput(parcelId: string): Promise<ParcelInput | null> {
  try {
    const r = await apiFetch(`/api/parcels/${encodeURIComponent(parcelId)}`);
    if (!r.ok) return null;
    const d = (await r.json()) as {
      id: string;
      plotNumber: string;
      district: string;
      emirate: string;
      area: number;
      currentValuation: string | null;
      affectionPlans?: Array<Parameters<typeof adaptSidePanelToInput>[1]>;
    };
    const plan = d.affectionPlans?.[0] ?? null;
    const aed = d.currentValuation ? Number(BigInt(d.currentValuation)) / 100 : null;
    return adaptSidePanelToInput(d, plan, aed);
  } catch {
    return null;
  }
}

const cellBase: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: `1px solid ${LINE}`,
  verticalAlign: 'top',
  fontSize: 12,
};

const stickyFirst: React.CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 1,
  // Opaque: values scroll underneath this column on a narrow screen.
  background: 'rgba(10, 22, 40, 0.98)',
};

export default function ComparePageClient({ raw }: { raw: string }) {
  const [items, setItems] = useState<CompareItemDto[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [parcels, setParcels] = useState<Record<string, ParcelInput | null>>({});
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const parsed = parseCompareIds(raw);
    if (!parsed.ok) {
      setError(describeStudiesError({ status: 400, code: parsed.error }));
      setState('invalid');
      return;
    }
    setState('loading');
    setError(null);
    const r = await compareVersions(parsed.ids);
    if (r.ok) {
      setItems(r.data.items);
      setState('ready');
    } else if (isStudiesUnavailable(r)) {
      setState('unavailable');
    } else {
      setError(
        r.code === 'not_found'
          ? 'One or more of these versions does not exist or is not shared with you.'
          : describeStudiesError(r),
      );
      setState('error');
    }
  }, [raw]);

  useEffect(() => {
    void load();
  }, [load]);

  // Today's plot facts, for the plot half of the staleness check. Only plots
  // with a public Parcel row can be checked here.
  useEffect(() => {
    if (state !== 'ready') return;
    const ids = [...new Set(items.map((it) => it.study.parcelId).filter((x): x is string => !!x))];
    if (ids.length === 0) return;
    let cancelled = false;
    void Promise.all(ids.map(async (id) => [id, await fetchParcelInput(id)] as const)).then((pairs) => {
      if (!cancelled) setParcels(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [state, items]);

  const staleness: Staleness[] = useMemo(
    () => items.map((it) => stalenessOf(it.version, it.study.parcelId ? parcels[it.study.parcelId] ?? null : null)),
    [items, parcels],
  );
  const outputs = useMemo(() => items.map((it) => it.version.outputs), [items]);
  const best = useMemo(() => COMPARE_METRICS.map((m) => bestIndex(m, outputs)), [outputs]);
  const assumptions = useMemo(() => assumptionRows(items.map((it) => it.version.inputs)), [items]);
  const differing = assumptions.filter((r) => r.differs).length;
  const shownAssumptions = onlyDiff ? assumptions.filter((r) => r.differs) : assumptions;
  const anyStale = staleness.some((s) => s.stale);

  const exportPdf = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    try {
      // jsPDF is heavy — loaded only when the export is asked for.
      const { downloadComparePdf } = await import('@/lib/feasibility-v6/comparePdf');
      downloadComparePdf({ items, staleness });
    } catch {
      setExportError('The PDF could not be created. Try again.');
    } finally {
      setExporting(false);
    }
  }, [items, staleness]);

  const n = items.length;
  const minTableWidth = 220 + n * 190;

  return (
    <div style={{ minHeight: '100vh', background: BG_GRADIENT, color: TXT, fontFamily: BODY_FONT, fontSize: 12 }}>
      <StudiesKeyframes />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px 64px' }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ color: SUBTLE, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Feasibility</div>
            <h1 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, margin: '2px 0 0', letterSpacing: '-0.01em' }}>Compare studies</h1>
            {state === 'ready' && (
              <div style={{ color: DIM, marginTop: 4 }}>
                {n} saved versions side by side. Figures are as saved — nothing here is recalculated.
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Btn tone="quiet" href="/feasibility/studies">
              All studies
            </Btn>
            <Btn onClick={() => void exportPdf()} disabled={state !== 'ready' || exporting}>
              {exporting ? 'Preparing…' : 'Export PDF'}
            </Btn>
          </div>
        </header>

        {state === 'loading' && <div style={{ ...glassCard, padding: 16, color: SUBTLE }}>Loading the comparison…</div>}

        {state === 'invalid' && (
          <Notice tone="error">
            <div>
              {error} A comparison needs {COMPARE_MIN}–{COMPARE_MAX} saved versions.
            </div>
            <div style={{ marginTop: 6 }}>
              <Btn small href="/feasibility/studies">
                Choose versions
              </Btn>
            </div>
          </Notice>
        )}

        {state === 'unavailable' && <Notice tone="info">Saved studies are not switched on yet, so there is nothing to compare.</Notice>}

        {state === 'error' && (
          <Notice tone="error">
            <div>{error}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Btn small onClick={() => void load()}>
                Retry
              </Btn>
              <Btn small tone="quiet" href="/feasibility/studies">
                Choose versions
              </Btn>
            </div>
          </Notice>
        )}

        {exportError && (
          <div style={{ marginBottom: 12 }}>
            <Notice tone="error">{exportError}</Notice>
          </div>
        )}

        {state === 'ready' && (
          <>
            {anyStale && (
              <div style={{ marginBottom: 14 }}>
                <Notice tone="warn">
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Some of these versions were saved before something changed</div>
                  {items.map((it, i) =>
                    staleness[i].stale ? (
                      <div key={it.version.id} style={{ marginTop: 4 }}>
                        <span style={{ color: GOLD, fontWeight: 700 }}>{letter(i)}</span> · {it.version.name}
                        <ul style={{ margin: '2px 0 0', paddingLeft: 16 }}>
                          {stalenessLines(staleness[i]).map((l) => (
                            <li key={l}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )}
                  <div style={{ color: DIM, marginTop: 6 }}>
                    To bring a version up to date, open it in the calculator and use “Recompute on today’s defaults”, then save a new version.
                  </div>
                </Notice>
              </div>
            )}

            {/* ── Results ─────────────────────────────────────────────── */}
            <section style={{ ...glassCard, marginBottom: 16, overflow: 'hidden', animation: 'zaahiStudiesFade 200ms ease-in-out' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: minTableWidth, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ ...cellBase, ...stickyFirst, textAlign: 'left', borderBottom: `1px solid ${LINE_HARD}`, width: 220 }}>
                        <span style={{ color: GOLD, fontFamily: SERIF, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Results</span>
                      </th>
                      {items.map((it, i) => (
                        <th key={it.version.id} scope="col" style={{ ...cellBase, textAlign: 'right', borderBottom: `1px solid ${LINE_HARD}`, fontWeight: 400 }}>
                          <div style={{ color: GOLD, fontFamily: SERIF, fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{letter(i)}</div>
                          <div style={{ color: TXT, fontSize: 13, fontWeight: 700, marginTop: 4 }}>{it.version.name}</div>
                          <div style={{ color: DIM, fontSize: 11 }}>
                            {it.study.name} · v{it.version.version}
                          </div>
                          <div style={{ color: SUBTLE, fontSize: 11 }}>
                            Plot {it.study.plotNumber}
                            {it.study.district ? ` · ${it.study.district}` : ''}
                          </div>
                          <div style={{ color: SUBTLE, fontSize: 11 }}>Saved {fmtDate(it.version.createdAt)}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, marginTop: 6 }}>
                            <Flag tone={staleness[i].stale ? 'warn' : 'ok'}>
                              {staleness[i].stale ? 'Changed since saved' : staleness[i].plotChecked ? 'Up to date' : 'Defaults up to date'}
                            </Flag>
                            {it.access === 'shared' && <Flag tone="ok">Shared with you</Flag>}
                          </div>
                          {it.version.notes && (
                            <div title={it.version.notes} style={{ color: DIM, fontSize: 11, fontStyle: 'italic', marginTop: 6, maxWidth: 240, marginLeft: 'auto', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {it.version.notes}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE_METRICS.map((m, r) => (
                      <tr key={m.key}>
                        <th scope="row" style={{ ...cellBase, ...stickyFirst, textAlign: 'left', color: DIM, fontWeight: 400 }}>
                          {m.label}
                        </th>
                        {outputs.map((o, i) => {
                          const isBest = best[r] === i;
                          const isVerdict = m.key === 'verdictLabel';
                          return (
                            <td
                              key={items[i].version.id}
                              style={{
                                ...cellBase,
                                textAlign: 'right',
                                fontVariantNumeric: 'tabular-nums',
                                fontWeight: isBest ? 800 : 400,
                                color: TXT,
                                background: isBest ? GREEN_WASH : 'transparent',
                                boxShadow: isBest ? `inset 2px 0 0 ${GREEN}` : 'none',
                              }}
                            >
                              {isVerdict && o.verdictLabel ? <VerdictPill label={o.verdictLabel} tone={o.verdictTone} /> : formatMetric(m, o)}
                              {isBest && (
                                <span style={{ color: GOLD, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginLeft: 6 }}>Best</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ color: SUBTLE, fontSize: 11, padding: '8px 12px' }}>
                “Best” marks the better value in a row where higher or lower is plainly better. A version with no result is never best.
              </div>
            </section>

            {/* ── Assumptions ─────────────────────────────────────────── */}
            <section style={{ ...glassCard, overflow: 'hidden', animation: 'zaahiStudiesFade 200ms ease-in-out' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 12px 10px', borderBottom: `1px solid ${LINE_HARD}` }}>
                <div>
                  <span style={{ color: GOLD, fontFamily: SERIF, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Assumptions</span>
                  <span style={{ color: differing > 0 ? AMBER : SUBTLE, marginLeft: 10 }}>
                    {differing === 0 ? 'identical across these versions' : `${differing} of ${assumptions.length} differ`}
                  </span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: DIM, fontSize: 11 }}>
                  <Check checked={onlyDiff} onChange={setOnlyDiff} label="Show only differences" />
                  <span onClick={() => setOnlyDiff((v) => !v)} style={{ cursor: 'pointer' }}>
                    Show only differences
                  </span>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: minTableWidth, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ ...cellBase, ...stickyFirst, textAlign: 'left', color: SUBTLE, fontWeight: 400, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', width: 220 }}>
                        Assumption
                      </th>
                      {items.map((it, i) => (
                        <th key={it.version.id} scope="col" style={{ ...cellBase, textAlign: 'left', color: DIM, fontWeight: 400 }}>
                          <span style={{ color: GOLD, fontWeight: 700 }}>{letter(i)}</span> · {it.version.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shownAssumptions.length === 0 && (
                      <tr>
                        <td colSpan={n + 1} style={{ ...cellBase, color: SUBTLE }}>
                          No differences — these versions rest on the same assumptions.
                        </td>
                      </tr>
                    )}
                    {shownAssumptions.map((row) => (
                      <tr key={row.label} style={{ background: row.differs ? 'rgba(230, 126, 34, 0.08)' : 'transparent' }}>
                        <th
                          scope="row"
                          style={{
                            ...cellBase,
                            ...stickyFirst,
                            textAlign: 'left',
                            fontWeight: row.differs ? 700 : 400,
                            color: row.differs ? TXT : DIM,
                            boxShadow: row.differs ? `inset 3px 0 0 ${AMBER}` : 'none',
                          }}
                        >
                          {row.label}
                          {row.differs && (
                            <span style={{ color: AMBER, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginLeft: 6 }}>Differs</span>
                          )}
                        </th>
                        {row.values.map((v, i) => (
                          <td key={items[i].version.id} style={{ ...cellBase, color: row.differs ? TXT : DIM, fontVariantNumeric: 'tabular-nums' }}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div style={{ color: SUBTLE, fontSize: 11, lineHeight: 1.5, marginTop: 14, maxWidth: 820 }}>
              Feasibility estimates, not valuations. Each column rests on its own assumptions; compare the results only after reading the rows marked “Differs”.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Flag({ tone, children }: { tone: 'ok' | 'warn'; children: React.ReactNode }) {
  const warn = tone === 'warn';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 7px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: warn ? TXT : DIM,
        border: `1px solid ${warn ? AMBER : 'rgba(255, 255, 255, 0.15)'}`,
        background: warn ? 'rgba(230, 126, 34, 0.18)' : 'rgba(255, 255, 255, 0.04)',
      }}
    >
      {children}
    </span>
  );
}
