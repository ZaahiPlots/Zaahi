'use client';

// ZAAHI Feasibility v6.1 — calculator.
//
// Rebuilt 2026-11-20 on a single model (src/lib/feasibility-v6/model.ts).
//
// The previous version of this file derived its numbers in a dozen separate
// useMemo blocks and rendered them in two hand-duplicated layouts. That is
// how the audit's worst findings got in: the unpriced-land guard gated the
// fullscreen layout but not the side panel (B1), and the Construction panel
// printed a single-engine figure under a mixed-use headline (B8).
//
// Now:
//   • ONE state object, `inputs` (StudyInputs) — exactly what a saved study stores;
//   • ONE call, computeFeasibility(inputs) — every number below reads from it;
//   • ONE set of blocks (hero / inputs / results) arranged by `mode`, so the
//     side panel and the fullscreen page cannot diverge;
//   • the PDF (pdf.ts) is handed the same model object.
//
// A blocked model (unknown land price, FAR, area or land use; a land use that
// is not development land; an engine with no revenue model) renders the
// blocker and nothing numeric that could be read as a result.

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { fmtAedExact, fmtAed, fmtPct, fmtInt } from '@/lib/feasibility';
import { ENGINES, ENGINE_ORDER, PROJECT_DEFAULTS, type EngineId, type EngineParams } from '@/lib/feasibility-v6/engines';
import { type ParcelInput } from '@/lib/feasibility-v6/parcelInput';
import {
  computeFeasibility,
  componentUnits,
  jvBaseMode,
  resolveArea,
  type StudyInputs,
  type ComponentInputs,
  type Mode,
  type Line,
  type JvType,
} from '@/lib/feasibility-v6/model';
import { inputsFromParcel, withEngine, seededComponent } from '@/lib/feasibility-v6/study';
import { routeLandUse } from '@/lib/feasibility-v6/routing';
import { downloadFeasibilityPdf } from '@/lib/feasibility-v6/pdf';
import DiffBadge from './DiffBadge';
import EngineSelector from './EngineSelector';
import StudiesBar from './StudiesBar';
import {
  GOLD, NAVY, TXT, DIM, SUBTLE, LINE, LINE_HARD, AMBER,
  useDebounced, NumberInput, Row, ResultRow, SectionTitle, EngineSelectorDisclosure, Panel,
} from './ui';

const RED = '#E63946';
const GREEN = '#2D6A4F';

type NumKey = Exclude<keyof EngineParams, 'rampPct'>;

export interface FeasibilityV6CalculatorProps {
  parcel: ParcelInput;
  // Preview route shows the RED internal banner; production omits it.
  banner?: 'preview' | 'none';
  // 'sidepanel' (~350 px) is the production mount inside /parcels/map;
  // 'fullscreen' is the two-column page. Same blocks, different arrangement.
  mode?: 'sidepanel' | 'fullscreen';
  // Restrict the engine dropdown to a subset of the catalogue.
  availableEngines?: EngineId[];
  // Set when the plot is being viewed as a vault entry, so saved studies attach to it.
  vaultEntryId?: string | null;
}

const MODE_LABEL: Record<Mode, string> = { bts: 'Build to Sell', btr: 'Build to Rent', jv: 'Joint Venture' };
const pctOrDash = (n: number) => (Number.isFinite(n) ? fmtPct(n) : '—');

// ── Small local controls ─────────────────────────────────────────────────

function Seg<T extends string>({ value, options, onChange }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(([v, label]) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={active}
            style={{
              padding: '6px 10px',
              background: active ? 'rgba(200,169,110,0.18)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? GOLD : LINE}`,
              borderRadius: 6,
              color: active ? GOLD : DIM,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** "40, 70, 90" — % of stabilised income in each year of operation. */
function RampInput({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const [raw, setRaw] = useState(value.join(', '));
  const last = useRef(value.join(', '));
  useEffect(() => {
    const ext = value.join(', ');
    if (ext !== last.current) {
      last.current = ext;
      setRaw(ext);
    }
  }, [value]);
  return (
    <input
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        const next = raw
          .split(/[,\s/]+/)
          .map((x) => Number(x))
          .filter((x) => Number.isFinite(x) && x >= 0 && x <= 100)
          .slice(0, 10);
        last.current = next.join(', ');
        setRaw(last.current);
        onChange(next);
      }}
      aria-label="Ramp-up, percent of stabilised income per year"
      placeholder="e.g. 40, 70, 90"
      style={{
        width: '100%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        padding: '8px 10px',
        color: TXT,
        fontSize: 12,
        fontFamily: 'inherit',
        outline: 'none',
        fontVariantNumeric: 'tabular-nums',
      }}
    />
  );
}

function Note({ children, tone = 'dim' }: { children: React.ReactNode; tone?: 'dim' | 'amber' }) {
  return (
    <div style={{ color: tone === 'amber' ? AMBER : SUBTLE, fontSize: 10.5, lineHeight: 1.5, margin: '6px 0 2px' }}>
      {children}
    </div>
  );
}

function LineTable({ lines, totalLabel, total }: { lines: Line[]; totalLabel: string; total: number }) {
  return (
    <div>
      {lines.map((l) => (
        <div key={l.id} title={l.basis}>
          <ResultRow label={l.label} value={fmtAedExact(l.aed)} />
        </div>
      ))}
      <ResultRow label={totalLabel} value={fmtAedExact(total)} bold gold />
    </div>
  );
}

// ── The calculator ───────────────────────────────────────────────────────

/**
 * Everything the starting inputs depend on. The calculator is keyed on it, so
 * a different plot — or the same plot once its price or affection plan has
 * loaded — starts from a clean slate: inputs, baseline, open panels and the
 * saved-study state all re-initialise together and cannot leak across plots.
 */
function parcelKeyOf(p: ParcelInput): string {
  return `${p.id}|${p.plotAreaSqft}|${p.far}|${p.maxGfaSqft}|${p.plotPriceAed}|${p.landPriceKnown}|${p.landUse}|${p.landUseMix.length}`;
}

export default function FeasibilityV6Calculator(props: FeasibilityV6CalculatorProps) {
  return <Calculator key={parcelKeyOf(props.parcel)} {...props} />;
}

function Calculator({
  parcel,
  banner = 'preview',
  mode = 'fullscreen',
  availableEngines,
  vaultEntryId = null,
}: FeasibilityV6CalculatorProps) {
  const side = mode === 'sidepanel';

  // Starting inputs for this parcel. If the routed engine is not offered, fall
  // back to the first one that is (never to an engine outside the dropdown).
  const seedFor = useCallback(
    (p: ParcelInput): StudyInputs => {
      const routed = routeLandUse(p.landUse).engineId;
      if (availableEngines && routed && !availableEngines.includes(routed) && availableEngines[0]) {
        return inputsFromParcel(p, availableEngines[0]);
      }
      return inputsFromParcel(p);
    },
    [availableEngines],
  );

  const [inputs, setInputs] = useState<StudyInputs>(() => seedFor(parcel));
  // What the fields started at — the baseline the diff badges compare with.
  const [baseline, setBaseline] = useState<StudyInputs>(() => seedFor(parcel));
  const [dirty, setDirty] = useState(false);

  const update = useCallback((fn: (i: StudyInputs) => StudyInputs) => {
    setInputs(fn);
    setDirty(true);
  }, []);
  const setSec = useCallback(
    <K extends 'site' | 'land' | 'programme' | 'softCosts' | 'sales' | 'rental' | 'finance' | 'jv'>(k: K, patch: Partial<StudyInputs[K]>) =>
      update((p) => ({ ...p, [k]: { ...p[k], ...patch } })),
    [update],
  );
  const setComp = useCallback(
    (i: number, patch: Partial<ComponentInputs>) =>
      update((p) => ({ ...p, components: p.components.map((c, j) => (j === i ? { ...c, ...patch } : c)) })),
    [update],
  );

  // The FAR is "user input" only when the plan had nothing to offer.
  const farIsUserInput = parcel.far == null && parcel.maxGfaSqft == null;
  const dInputs = useDebounced(inputs, 250);
  const model = useMemo(() => computeFeasibility(dInputs, { farIsUserInput }), [dInputs, farIsUserInput]);
  const core = model.core;
  const jv = model.jv;

  const tab = inputs.mode;
  const isMixed = inputs.components.length > 1;
  const lead = inputs.components[0];
  const leadEngine = ENGINES[lead.engineId];
  const baseMode: 'bts' | 'btr' | null = tab === 'jv' ? jvBaseMode(inputs.components) : tab;
  const route = routeLandUse(parcel.landUse);
  const area = resolveArea(inputs.site, farIsUserInput);

  const setEngine = (id: EngineId) => {
    update((p) => withEngine(p, id, parcel));
    setBaseline((b) => withEngine(b, id, parcel));
  };
  const setSliceEngine = (i: number, id: EngineId) => {
    const next = (c: ComponentInputs) => ({ ...seededComponent(id, parcel, c.key, c.label, c.sharePct) });
    update((p) => ({ ...p, components: p.components.map((c, j) => (j === i ? next(c) : c)) }));
    setBaseline((b) => ({ ...b, components: b.components.map((c, j) => (j === i ? next(c) : c)) }));
  };

  const engineSelectorNote = isMixed
    ? `This plot is mixed use, so each use runs its own engine — ${inputs.components
        .map((c) => `${ENGINES[c.engineId].label} ${Math.round(c.sharePct)}%`)
        .join(', ')}. Edit the uses and their shares in Use mix.`
    : undefined;

  // ── Field helpers ──────────────────────────────────────────────────────
  const num = (
    label: string,
    value: number,
    onChange: (n: number) => void,
    o?: { unit?: string; tip?: string; base?: number },
  ) => (
    <Row
      key={label}
      label={label}
      tooltipKey={o?.tip}
      stacked={side}
      badge={o?.base != null && o.base > 0 && value !== o.base ? <DiffBadge current={value} baseline={o.base} onReset={() => onChange(o.base as number)} /> : undefined}
    >
      <NumberInput value={value} unit={o?.unit} onChange={onChange} fullWidth={side} ariaLabel={label} />
    </Row>
  );
  const ro = (label: string, value: number, unit?: string, tip?: string) => (
    <Row key={label} label={label} tooltipKey={tip} stacked={side}>
      <NumberInput value={value} unit={unit} readonly fullWidth={side} ariaLabel={label} />
    </Row>
  );
  /** A per-component engine parameter, with its provenance tooltip and diff badge. */
  const cf = (i: number, key: NumKey, label: string, unit?: string) => {
    const c = inputs.components[i];
    const b = baseline.components[i];
    return num(label, c[key], (n) => setComp(i, { [key]: n } as Partial<ComponentInputs>), {
      unit,
      tip: `prov:${c.engineId}:${key}`,
      base: b && b.engineId === c.engineId ? b[key] : undefined,
    });
  };
  const choice = (label: string, node: React.ReactNode, tip?: string) => (
    <Row key={label} label={label} tooltipKey={tip} stacked>
      {node}
    </Row>
  );

  // ── Hero ───────────────────────────────────────────────────────────────
  const heroShell: React.CSSProperties = {
    position: side ? 'sticky' : 'static',
    top: 0,
    zIndex: 20,
    // Navy at 0.85 keeps the gold figure readable over a light basemap
    // (founder decision D-20; design-tokens PANEL_BG).
    background: 'rgba(10, 22, 40, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid ${LINE_HARD}`,
    borderRadius: 14,
    padding: '14px 16px',
    marginBottom: 12,
    boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
  };
  const eyebrow: React.CSSProperties = { color: DIM, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 };
  const bigNumber = (color: string): React.CSSProperties => ({
    fontFamily: 'Georgia, serif',
    fontSize: side ? 26 : 32,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.1,
  });
  const subLine: React.CSSProperties = { color: DIM, fontSize: 12, marginTop: 6, fontVariantNumeric: 'tabular-nums' };
  const strong = (s: string) => <span style={{ color: TXT, fontWeight: 700 }}>{s}</span>;
  const dot = <span style={{ color: SUBTLE }}> · </span>;

  const hero = (
    <div style={heroShell} data-testid="feasibility-hero">
      {model.status === 'blocked' && (
        <div role="alert">
          {model.blockers.map((b, i) => (
            <div key={b.code} style={{ marginTop: i > 0 ? 12 : 0 }}>
              {i === 0 && <div style={eyebrow}>No result</div>}
              <div style={{ fontFamily: 'Georgia, serif', fontSize: side ? 18 : 22, fontWeight: 800, letterSpacing: '-0.01em', color: AMBER, lineHeight: 1.2 }}>
                {b.title}
              </div>
              <div style={{ color: DIM, fontSize: 11.5, marginTop: 6, lineHeight: 1.55 }}>{b.message}</div>
              {b.code === 'NOT_DEVELOPABLE' && (
                <button
                  type="button"
                  onClick={() => setSec('site', { changeOfUseAck: true })}
                  style={{
                    marginTop: 8,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(200,169,110,0.3)',
                    color: GOLD,
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'background 150ms ease, border-color 150ms ease',
                  }}
                >
                  Model a change-of-use scenario
                </button>
              )}
            </div>
          ))}
          {model.partial.constructionAed != null && (
            <div style={{ color: SUBTLE, fontSize: 10.5, marginTop: 10, lineHeight: 1.5 }}>
              What is known: GFA {fmtInt(model.partial.gfaSqft ?? 0)} sqft · build cost {fmtAed(model.partial.constructionAed)} before land. This is not a result.
            </div>
          )}
        </div>
      )}

      {core && model.verdict && (
        <>
          {tab === 'bts' && (
            <>
              <div style={eyebrow}>Net Profit</div>
              <div style={bigNumber(core.profitAed >= 0 ? GOLD : RED)}>{fmtAedExact(core.profitAed)}</div>
              <div style={subLine}>
                ROI {strong(fmtPct(core.roiPct))}
                {dot}IRR {strong(pctOrDash(core.irrPct))}
                {dot}Margin on GDV {strong(fmtPct(core.marginOnGdvPct))}
              </div>
            </>
          )}
          {tab === 'btr' && (
            <>
              <div style={eyebrow}>Yield on cost</div>
              <div style={bigNumber(core.yieldOnCostPct >= 5 ? GOLD : RED)}>{fmtPct(core.yieldOnCostPct)}</div>
              <div style={subLine}>
                IRR {strong(pctOrDash(core.irrPct))}
                {dot}Payback {strong(Number.isFinite(core.paybackYears) ? `${core.paybackYears.toFixed(1)} yr` : '—')}
                {dot}Stabilised NOI {strong(fmtAed(core.stabilisedNoiAed))}
              </div>
            </>
          )}
          {tab === 'jv' && jv && (
            <>
              <div style={eyebrow}>Project profit · {jv.baseMode === 'bts' ? 'sale' : 'hold'} economics</div>
              <div style={bigNumber(jv.project.profitAed >= 0 ? GOLD : RED)}>{fmtAedExact(jv.project.profitAed)}</div>
              <div style={subLine}>
                Project IRR {strong(pctOrDash(jv.project.irrPct))}
                {dot}Landowner IRR {strong(pctOrDash(jv.landowner.irrPct))}
                {dot}Developer IRR {strong(pctOrDash(jv.developer.irrPct))}
              </div>
            </>
          )}
          <div style={{ ...subLine, fontSize: 11, marginTop: 4 }}>
            Total investment {strong(fmtAed(core.totalCostAed))}
            {dot}Peak equity {strong(fmtAed(core.peakEquityAed))}
            {dot}{core.timeline.preConstructionMonths + core.timeline.constructionMonths} mo to handover
          </div>
          <div
            role="status"
            title={model.verdict.threshold}
            style={{
              marginTop: 10,
              padding: '6px 10px',
              border: `1px solid ${model.verdict.color}`,
              borderRadius: 8,
              color: model.verdict.color === GREEN ? '#6FCF97' : model.verdict.color,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            {model.verdict.banded ? `IRR · ${model.verdict.label}` : model.verdict.label}
          </div>
          {!model.verdict.banded && <Note tone="amber">{model.verdict.threshold}</Note>}
          {model.caveats.map((c) => (
            <Note key={c} tone="amber">
              {c}
            </Note>
          ))}
        </>
      )}
    </div>
  );

  // ── Input panels ───────────────────────────────────────────────────────
  const componentCostFields = (i: number) => {
    const c = inputs.components[i];
    const eng = ENGINES[c.engineId];
    return (
      <>
        {eng.capexPerUnitAed > 0 || c.capexPerUnitAed > 0 ? cf(i, 'capexPerUnitAed', `Capex per ${eng.unitLabel || 'unit'}`, 'AED') : null}
        {eng.constructionPsfGfa > 0 || c.constructionPsfGfa > 0 ? cf(i, 'constructionPsfGfa', 'Construction', 'AED/sqft GFA') : null}
        {c.buaGfaRatio > 1 ? cf(i, 'parkingPsf', 'Parking & basements', 'AED/sqft') : null}
        {cf(i, 'brandPsfGfa', 'Brand premium', 'AED/sqft GFA')}
        {cf(i, 'infrastructurePsfGfa', 'Infrastructure', 'AED/sqft GFA')}
        {cf(i, 'consultancyPct', 'Consultancy', '%')}
        {cf(i, 'contingencyPct', 'Contingency', '%')}
        {eng.kind === 'operating' && cf(i, 'equipmentPerUnitAed', `FF&E / equipment per ${eng.unitLabel.replace(/s$/, '')}`, 'AED')}
        {eng.kind === 'operating' && cf(i, 'preOpeningPerUnitAed', `Pre-opening per ${eng.unitLabel.replace(/s$/, '')}`, 'AED')}
      </>
    );
  };

  const componentRevenueFields = (i: number) => {
    const c = inputs.components[i];
    const eng = ENGINES[c.engineId];
    const b = baseline.components[i];
    if (eng.kind === 'operating') {
      const gfa = (area?.gfaSqft ?? 0) * (c.sharePct / 100);
      const autoUnits = componentUnits({ ...c, units: null }, gfa);
      const unit1 = eng.unitLabel.replace(/s$/, '');
      return (
        <>
          {num(
            `${eng.unitLabel[0].toUpperCase()}${eng.unitLabel.slice(1)}`,
            c.units ?? autoUnits,
            (n) => setComp(i, { units: n > 0 ? n : null }),
            { unit: eng.unitLabel, base: eng.unitsMustBeEntered ? undefined : autoUnits },
          )}
          {eng.unitsMustBeEntered ? (
            <Note>Enter the IT load you have power for. Roughly {fmtInt(c.gfaPerUnitSqm)} sqm of building per MW.</Note>
          ) : (
            <>
              {cf(i, 'gfaPerUnitSqm', `GFA per ${unit1}`, 'sqm')}
              <Note>
                {c.units == null ? `Derived from GFA ÷ ${fmtInt(c.gfaPerUnitSqm)} sqm.` : `Entered by you. GFA would allow about ${fmtInt(autoUnits)}.`}
              </Note>
            </>
          )}
          {cf(i, 'revenuePerUnit', eng.revenueBasis === 'night' ? 'ADR (per night)' : `Revenue per ${unit1} per year`, 'AED')}
          {eng.revenueBasis === 'night' && cf(i, 'otherRevenuePct', 'Non-room revenue', '% of rooms')}
          {cf(i, 'occupancyPct', eng.unitLabel === 'MW' ? 'Utilisation' : 'Occupancy', '%')}
          {cf(i, 'operatingPct', 'Operating costs', '% of revenue')}
          {cf(i, 'propertyIncomeSharePct', 'Income to property owner', '% of EBITDA')}
          {cf(i, 'exitCapRatePct', 'Exit cap rate', '%')}
          {choice(
            'Ramp-up (% of stabilised income, by year)',
            <RampInput value={c.rampPct} onChange={(v) => setComp(i, { rampPct: v })} />,
            `prov:${c.engineId}:rampPct`,
          )}
          {b && b.engineId === c.engineId && b.rampPct.join() !== c.rampPct.join() && <Note>Default {b.rampPct.join(' / ') || 'none'}.</Note>}
        </>
      );
    }
    if (baseMode === 'btr') {
      return (
        <>
          {cf(i, 'rentPsfSfaYear', 'Rent', 'AED/sqft/yr')}
          {cf(i, 'occupancyPct', 'Occupancy', '%')}
          {cf(i, 'operatingPct', 'Operating costs', '% of rent')}
          {cf(i, 'exitCapRatePct', 'Exit cap rate', '%')}
          {choice(
            'Lease-up (% of stabilised income, by year)',
            <RampInput value={c.rampPct} onChange={(v) => setComp(i, { rampPct: v })} />,
            `prov:${c.engineId}:rampPct`,
          )}
        </>
      );
    }
    return <>{cf(i, 'salesPsfSfa', 'Sale price', 'AED/sqft SFA')}</>;
  };

  const anyPsfSale = baseMode === 'bts' && inputs.components.some((c) => ENGINES[c.engineId].kind === 'psf');
  const anyOperating = inputs.components.some((c) => ENGINES[c.engineId].kind === 'operating');
  const P = PROJECT_DEFAULTS;

  const inputPanels = (
    <>
      <Panel
        title="Site & area"
        defaultOpen={model.blockers.some((b) => b.code === 'FAR_UNKNOWN')}
        metric={area ? `GFA ${fmtInt(area.gfaSqft)} sqft · ${area.gfaSource === 'affection plan Max GFA' ? 'plan Max GFA' : `FAR ${area.far.toFixed(2)}`}` : 'FAR unknown'}
      >
        {ro('Plot area', parcel.plotAreaSqft, 'sqft', 'plotArea')}
        {parcel.far != null || parcel.maxGfaSqft != null
          ? ro(`FAR (${area?.farSource ?? 'affection plan'})`, Number((area?.far ?? 0).toFixed(3)), undefined, 'far')
          : num('FAR — enter it', inputs.site.far ?? 0, (n) => setSec('site', { far: n > 0 ? n : null }), { tip: 'far' })}
        {farIsUserInput && <Note tone="amber">The affection plan has no FAR or Max GFA for this plot. Nothing is assumed — enter the FAR from the plan or the master developer.</Note>}
        {area && ro(`GFA (${area.gfaSource})`, Math.round(area.gfaSqft), 'sqft', 'gfa')}
        {!isMixed && (
          <>
            {cf(0, 'buaGfaRatio', 'BUA ÷ GFA (incl. parking)')}
            {cf(0, 'efficiencyPct', 'Efficiency (SFA ÷ GFA)', '%')}
            {core && ro('BUA', Math.round(core.areas.buaSqft), 'sqft', 'bua')}
            {core && ro('SFA', Math.round(core.areas.sfaSqft), 'sqft', 'sfa')}
          </>
        )}
      </Panel>

      {isMixed && (
        <Panel title="Use mix" defaultOpen metric={`${inputs.components.length} uses · ${inputs.components.reduce((s, c) => s + c.sharePct, 0).toFixed(0)}%`}>
          <Note>Each use runs its own engine. Shares are of GFA and must total 100%. This mix drives every number above.</Note>
          {inputs.components.map((c, i) => {
            const res = core?.components.find((x) => x.key === c.key);
            return (
              <div key={c.key} style={{ borderTop: `1px solid ${LINE}`, marginTop: 10, paddingTop: 10 }}>
                <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{c.label}</div>
                {choice(
                  'Engine',
                  <select
                    value={c.engineId}
                    onChange={(e) => setSliceEngine(i, e.target.value as EngineId)}
                    aria-label={`Engine for ${c.label}`}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6,
                      padding: '8px 10px',
                      color: TXT,
                      fontSize: 12,
                      fontFamily: 'inherit',
                      appearance: 'none',
                      outline: 'none',
                    }}
                  >
                    {ENGINE_ORDER.filter((id) => id !== 'mixeduse').map((id) => (
                      <option key={id} value={id} style={{ background: NAVY, color: TXT }}>
                        {ENGINES[id].label}
                        {ENGINES[id].kind === 'none' ? ' (not modelled)' : ''}
                      </option>
                    ))}
                  </select>,
                )}
                <div data-testid={`mix-share-${i}`}>
                  {num('Share of GFA', c.sharePct, (n) => setComp(i, { sharePct: n }), { unit: '%', base: baseline.components[i]?.sharePct })}
                </div>
                {cf(i, 'buaGfaRatio', 'BUA ÷ GFA')}
                {cf(i, 'efficiencyPct', 'Efficiency', '%')}
                {componentCostFields(i)}
                {componentRevenueFields(i)}
                {res && (
                  <Note>
                    {fmtInt(res.gfaSqft)} sqft GFA{res.units > 0 ? ` · ${fmtInt(res.units)} ${res.unitLabel}` : ''} · build {fmtAed(res.constructionAed + res.equipmentAed + res.preOpeningAed)} ·{' '}
                    {res.kind === 'psf' && baseMode === 'bts' ? 'sales' : 'value'} {fmtAed(res.exitValueAed)} · contribution {fmtAed(res.contributionAed)}
                  </Note>
                )}
              </div>
            );
          })}
        </Panel>
      )}

      <Panel
        title="Land"
        defaultOpen={model.blockers.some((b) => b.code === 'LAND_PRICE_UNKNOWN')}
        metric={inputs.land.costAed ? `${fmtAed(inputs.land.costAed)}${area ? ` · ${fmtInt(inputs.land.costAed / area.gfaSqft)}/sqft GFA` : ''}` : 'Not set'}
        changed={inputs.land.costAed !== baseline.land.costAed}
      >
        {num('Land cost', inputs.land.costAed ?? 0, (n) => setSec('land', { costAed: n > 0 ? n : null }), { unit: 'AED', tip: 'landCost', base: baseline.land.costAed ?? undefined })}
        <Note>
          {parcel.landPriceKnown ? `Price on record: ${fmtAedExact(parcel.plotPriceAed)}.` : 'No price on record — the figure above is yours. ZAAHI never estimates a land price.'}
        </Note>
        {tab !== 'jv' && (
          <>
            {num('DLD transfer fee', inputs.land.dldPct, (n) => setSec('land', { dldPct: n }), { unit: '%', tip: 'dldFee', base: 4 })}
            {num('Brokerage on land', inputs.land.brokeragePct, (n) => setSec('land', { brokeragePct: n }), { unit: '%', tip: 'brokerageOnLand' })}
            {choice(
              'Payment',
              <Seg value={inputs.land.paymentMode} options={[['full', 'In full'], ['installments', 'Instalments']]} onChange={(v) => setSec('land', { paymentMode: v })} />,
              'paymentMode',
            )}
            {inputs.land.paymentMode === 'installments' && (
              <>
                {num('Down payment', inputs.land.downPaymentPct, (n) => setSec('land', { downPaymentPct: n }), { unit: '%', tip: 'downPayment' })}
                {num('Balance paid over', inputs.land.installmentMonths, (n) => setSec('land', { installmentMonths: n }), { unit: 'months', tip: 'periodMonths' })}
              </>
            )}
          </>
        )}
      </Panel>

      <Panel
        title="Programme"
        metric={`${inputs.programme.preConstructionMonths} mo design + ${inputs.programme.constructionMonths} mo build`}
        changed={inputs.programme.constructionMonths !== baseline.programme.constructionMonths || inputs.programme.preConstructionMonths !== baseline.programme.preConstructionMonths}
      >
        {num('Design + permits', inputs.programme.preConstructionMonths, (n) => setSec('programme', { preConstructionMonths: n }), {
          unit: 'months',
          tip: `prov:${lead.engineId}:preConstructionMonths`,
          base: baseline.programme.preConstructionMonths,
        })}
        {num('Construction', inputs.programme.constructionMonths, (n) => setSec('programme', { constructionMonths: n }), {
          unit: 'months',
          tip: `prov:${lead.engineId}:constructionMonths`,
          base: baseline.programme.constructionMonths,
        })}
        <Note>Time is a cost: every month before income lowers the IRR. Land is bought at month 0.</Note>
      </Panel>

      {!isMixed && (
        <Panel title="Construction" metric={core ? `${fmtAed(core.components[0].constructionAed + core.components[0].equipmentAed + core.components[0].preOpeningAed)}` : undefined}>
          {componentCostFields(0)}
        </Panel>
      )}

      <Panel title="Fees & soft costs" metric={`Authority ${inputs.softCosts.authorityFeesPct}% · overhead ${inputs.softCosts.developerOverheadPct}%`}>
        {num('Authority & utility fees', inputs.softCosts.authorityFeesPct, (n) => setSec('softCosts', { authorityFeesPct: n }), { unit: '% of construction', tip: 'proj:authorityFeesPct', base: P.authorityFeesPct })}
        {num('Developer overhead / PM', inputs.softCosts.developerOverheadPct, (n) => setSec('softCosts', { developerOverheadPct: n }), { unit: '% of construction', tip: 'proj:developerOverheadPct', base: P.developerOverheadPct })}
        {anyPsfSale && inputs.sales.offPlan && num('RERA registration & escrow', inputs.softCosts.reraFeesAed, (n) => setSec('softCosts', { reraFeesAed: n }), { unit: 'AED', tip: 'proj:reraFeesAed', base: P.reraFeesAed })}
        {num('Land holding cost', inputs.softCosts.landHoldingPctPa, (n) => setSec('softCosts', { landHoldingPctPa: n }), { unit: '% of land p.a.', tip: 'proj:landHoldingPctPa' })}
        {num('Irrecoverable VAT', inputs.softCosts.irrecoverableVatPct, (n) => setSec('softCosts', { irrecoverableVatPct: n }), { unit: '% of construction' })}
        <Note>VAT default 0%: a developer recovers input VAT on residential (zero-rated first supply) and commercial construction — FTA guide VATGRE1 s.7.2.</Note>
        {anyPsfSale && num('Service charge on unsold stock', inputs.softCosts.serviceChargeUnsoldPsfYear, (n) => setSec('softCosts', { serviceChargeUnsoldPsfYear: n }), { unit: 'AED/sqft/yr', tip: `prov:${lead.engineId}:serviceChargePsfYear`, base: baseline.softCosts.serviceChargeUnsoldPsfYear })}
      </Panel>

      {!isMixed && leadEngine.kind !== 'none' && (
        <Panel
          title={leadEngine.kind === 'operating' ? 'Asset model' : baseMode === 'btr' ? 'Rental' : 'Revenue'}
          defaultOpen={model.blockers.some((b) => b.code === 'UNITS_REQUIRED')}
          metric={
            core
              ? leadEngine.kind === 'operating'
                ? `${fmtInt(core.components[0].units)} ${leadEngine.unitLabel} · NOI ${fmtAed(core.stabilisedNoiAed)}`
                : baseMode === 'btr'
                  ? `NOI ${fmtAed(core.stabilisedNoiAed)}`
                  : `Gross ${fmtAed(core.components[0].grossSalesAed)}`
              : undefined
          }
        >
          {componentRevenueFields(0)}
          {inputs.site.priceBasis && leadEngine.kind === 'psf' && <Note>Price / rent seeded from the {inputs.site.priceBasis} area benchmark.</Note>}
        </Panel>
      )}

      {baseMode === 'bts' && (
        <Panel title="Sales" metric={anyPsfSale ? `${inputs.sales.offPlan ? 'Off-plan · escrow' : 'Sold at completion'} · commission ${inputs.sales.commissionPct}%` : `Asset sale fee ${inputs.sales.assetSaleFeePct}%`}>
          {anyPsfSale && (
            <>
              {num('Sales commission', inputs.sales.commissionPct, (n) => setSec('sales', { commissionPct: n }), { unit: '%', tip: `prov:${lead.engineId}:commissionPct`, base: baseline.sales.commissionPct })}
              {num('Marketing', inputs.sales.marketingPct, (n) => setSec('sales', { marketingPct: n }), { unit: '%', tip: `prov:${lead.engineId}:marketingPct`, base: baseline.sales.marketingPct })}
              {num('Developer services', inputs.sales.devServicesPct, (n) => setSec('sales', { devServicesPct: n }), { unit: '%', tip: 'devServices' })}
              {choice(
                'Sales route',
                <Seg value={inputs.sales.offPlan ? 'off' : 'ready'} options={[['ready', 'At completion'], ['off', 'Off-plan (escrow)']]} onChange={(v) => setSec('sales', { offPlan: v === 'off' })} />,
              )}
              {inputs.sales.offPlan && (
                <>
                  {num('Sold at launch', inputs.sales.soldAtLaunchPct, (n) => setSec('sales', { soldAtLaunchPct: n }), { unit: '%', tip: 'proj:soldAtLaunchPct', base: P.soldAtLaunchPct })}
                  {num('Sold by handover', inputs.sales.soldByHandoverPct, (n) => setSec('sales', { soldByHandoverPct: n }), { unit: '%', tip: 'proj:soldByHandoverPct', base: P.soldByHandoverPct })}
                  {num('Paid by buyers before handover', inputs.sales.paidDuringConstructionPct, (n) => setSec('sales', { paidDuringConstructionPct: n }), { unit: '%', tip: 'proj:paidDuringConstructionPct', base: P.paidDuringConstructionPct })}
                  {num('Escrow retention', inputs.sales.escrowRetentionPct, (n) => setSec('sales', { escrowRetentionPct: n }), { unit: '%', tip: 'proj:escrowRetentionPct', base: P.escrowRetentionPct })}
                </>
              )}
              {num('Sell-out after handover', inputs.sales.selloutMonthsAfterHandover, (n) => setSec('sales', { selloutMonthsAfterHandover: n }), { unit: 'months', tip: 'proj:selloutMonthsAfterHandover', base: P.selloutMonthsAfterHandover })}
            </>
          )}
          {anyOperating && (
            <>
              {num('Asset sale costs', inputs.sales.assetSaleFeePct, (n) => setSec('sales', { assetSaleFeePct: n }), { unit: '%', tip: 'proj:assetSaleFeePct', base: P.assetSaleFeePct })}
              <Note>An operating asset is sold whole, once its income has stabilised — an agent and legal fee, not unit-sales commission.</Note>
            </>
          )}
        </Panel>
      )}

      {(baseMode === 'btr' || anyOperating) && (
        <Panel title="Hold & exit" metric={baseMode === 'btr' ? `${inputs.rental.holdYears}-yr hold · growth ${inputs.rental.rentGrowthPct}%` : `Income growth ${inputs.rental.rentGrowthPct}%`}>
          {num('Income growth', inputs.rental.rentGrowthPct, (n) => setSec('rental', { rentGrowthPct: n }), { unit: '% p.a.', tip: 'proj:rentGrowthPct', base: P.rentGrowthPct })}
          {baseMode === 'btr' && (
            <>
              {num('Hold period', inputs.rental.holdYears, (n) => setSec('rental', { holdYears: n }), { unit: 'years', tip: 'proj:holdYears', base: P.holdYears })}
              {num('Exit selling costs', inputs.rental.exitSaleCostPct, (n) => setSec('rental', { exitSaleCostPct: n }), { unit: '%', tip: 'proj:exitSaleCostPct', base: P.exitSaleCostPct })}
            </>
          )}
        </Panel>
      )}

      <Panel title="Finance" metric={inputs.finance.enabled && inputs.finance.loanAed > 0 ? `${fmtAed(inputs.finance.loanAed)} at ${inputs.finance.ratePct}%` : 'No debt'}>
        {choice(
          'Construction loan',
          <Seg value={inputs.finance.enabled ? 'on' : 'off'} options={[['off', 'None'], ['on', 'Loan']]} onChange={(v) => setSec('finance', { enabled: v === 'on' })} />,
          'financeEnabled',
        )}
        {inputs.finance.enabled && (
          <>
            {num('Loan amount', inputs.finance.loanAed, (n) => setSec('finance', { loanAed: n }), { unit: 'AED', tip: 'loanAed' })}
            {num('Interest rate', inputs.finance.ratePct, (n) => setSec('finance', { ratePct: n }), { unit: '% p.a.', tip: 'proj:loanRatePct', base: P.loanRatePct })}
            <Note>Drawn against construction, interest rolled up on the drawn balance, repaid from the first proceeds.</Note>
            {baseMode === 'btr' && (
              <>
                {choice(
                  'At handover',
                  <Seg value={inputs.rental.debtAtHandover} options={[['refinance', 'Refinance & hold'], ['repay', 'Repay from equity']]} onChange={(v) => setSec('rental', { debtAtHandover: v })} />,
                )}
                {inputs.rental.debtAtHandover === 'refinance' && num('Term loan rate', inputs.rental.termRatePct, (n) => setSec('rental', { termRatePct: n }), { unit: '% p.a.', tip: 'proj:termRatePct', base: P.termRatePct })}
              </>
            )}
          </>
        )}
      </Panel>

      {tab === 'jv' && (
        <Panel title="Joint venture" defaultOpen metric={`${inputs.jv.type.replace('_', ' ')} · landowner ${jv ? jv.landownerSharePct.toFixed(1) : inputs.jv.landownerSharePct}%`}>
          {choice(
            'Structure',
            <Seg<JvType>
              value={inputs.jv.type}
              options={[['profit_share', 'Profit share'], ['revenue_share', 'Revenue share'], ['equity', 'Equity']]}
              onChange={(v) =>
                setSec('jv', {
                  type: v,
                  // Each structure has its own typical share; do not carry 30% of profit over as 30% of revenue.
                  landownerSharePct: v === 'revenue_share' ? P.jvRevenueSharePct : P.jvProfitSharePct,
                })
              }
            />,
            'jvType',
          )}
          <Note>
            {inputs.jv.type === 'profit_share' && 'Landowner gets the land value back, then a share of the profit.'}
            {inputs.jv.type === 'revenue_share' && 'Landowner receives a share of gross revenue instead of a land price — how most Dubai land JVs are struck.'}
            {inputs.jv.type === 'equity' && 'Both sides share in proportion to the capital they put in; the share is derived, not typed.'}
          </Note>
          {num('Land value contributed', inputs.jv.landValueAed ?? inputs.land.costAed ?? 0, (n) => setSec('jv', { landValueAed: n > 0 ? n : null }), { unit: 'AED', tip: 'landownerLandContribution', base: inputs.land.costAed ?? undefined })}
          <Note>{inputs.jv.landValueAed == null ? 'Follows the Land cost above.' : 'Overridden — click the badge to follow the Land cost again.'}</Note>
          {num('Landowner cash', inputs.jv.landownerCashAed, (n) => setSec('jv', { landownerCashAed: n }), { unit: 'AED' })}
          {inputs.jv.type !== 'equity' &&
            num(inputs.jv.type === 'revenue_share' ? 'Landowner share of revenue' : 'Landowner share of profit', inputs.jv.landownerSharePct, (n) => setSec('jv', { landownerSharePct: n }), {
              unit: '%',
              tip: inputs.jv.type === 'revenue_share' ? 'proj:jvRevenueSharePct' : 'proj:jvProfitSharePct',
              base: inputs.jv.type === 'revenue_share' ? P.jvRevenueSharePct : P.jvProfitSharePct,
            })}
          {num('DLD development-agreement fee', inputs.jv.developmentAgreementFeePct, (n) => setSec('jv', { developmentAgreementFeePct: n }), { unit: '% of land value', tip: 'proj:jvDevelopmentAgreementFeePct', base: P.jvDevelopmentAgreementFeePct })}
        </Panel>
      )}
    </>
  );

  // ── Results ────────────────────────────────────────────────────────────
  const results = core && (
    <>
      <SectionTitle>Investment</SectionTitle>
      <LineTable lines={core.costLines} totalLabel="Total investment" total={core.totalCostAed} />

      <div style={{ height: 14 }} />
      <SectionTitle>{core.mode === 'bts' ? 'Revenue' : 'Income & exit'}</SectionTitle>
      <LineTable lines={core.revenueLines} totalLabel="Net revenue" total={core.netRevenueAed} />

      <div style={{ height: 14 }} />
      <SectionTitle>Returns</SectionTitle>
      <ResultRow label="Net profit (net revenue − total investment)" value={fmtAedExact(core.profitAed)} bold gold />
      <ResultRow label="ROI on total investment" value={fmtPct(core.roiPct)} />
      <ResultRow label="IRR (annualised, on equity)" value={pctOrDash(core.irrPct)} bold />
      <ResultRow label="Peak equity" value={fmtAedExact(core.peakEquityAed)} />
      <ResultRow label="Equity multiple" value={`${core.equityMultiple.toFixed(2)}×`} />
      <ResultRow label={`NPV at ${inputs.discountRatePct}%`} value={fmtAedExact(core.npvAed)} />
      {core.stabilisedNoiAed > 0 && (core.mode === 'btr' || anyOperating) && (
        <>
          <ResultRow label="Stabilised NOI (per year)" value={fmtAedExact(core.stabilisedNoiAed)} />
          <ResultRow label="Yield on cost" value={fmtPct(core.yieldOnCostPct)} />
          {core.mode === 'btr' && <ResultRow label="Payback on income" value={Number.isFinite(core.paybackYears) ? `${core.paybackYears.toFixed(1)} years` : 'not within 100 years'} />}
        </>
      )}
      {core.interestAed > 0 && <ResultRow label="Peak loan balance" value={fmtAedExact(core.loanPeakAed)} />}
      <Note>
        Timeline: land at month 0 · site start month {core.timeline.preConstructionMonths + 1} · handover month {core.timeline.handoverMonth} · last cash event month {core.timeline.endMonth}.
      </Note>

      {core.escrow && (
        <>
          <div style={{ height: 14 }} />
          <SectionTitle>Escrow (Law 8/2007)</SectionTitle>
          <ResultRow label="Buyer receipts into escrow" value={fmtAedExact(core.escrow.receiptsAed)} />
          <ResultRow label="Drawn for construction" value={fmtAedExact(core.escrow.drawnAed)} />
          <ResultRow label="Released at handover" value={fmtAedExact(core.escrow.releasedAtHandoverAed)} />
          <ResultRow label={`Retention, released month ${core.escrow.retentionReleaseMonth}`} value={fmtAedExact(core.escrow.retentionAed)} />
        </>
      )}

      {(core.components.length > 1 || core.components[0].units > 0) && (
        <>
          <div style={{ height: 14 }} />
          <SectionTitle>{core.components.length > 1 ? 'By use' : 'Asset'}</SectionTitle>
          {core.components.map((c) => (
            <div key={c.key} style={{ marginBottom: 8 }}>
              <div style={{ color: GOLD, fontSize: 11, fontWeight: 700 }}>
                {c.label} · {c.engineLabel} · {c.sharePct.toFixed(1)}%
              </div>
              <ResultRow label={`GFA${c.units > 0 ? ` · ${fmtInt(c.units)} ${c.unitLabel}` : ''}`} value={`${fmtInt(c.gfaSqft)} sqft`} />
              <ResultRow label="Build cost (incl. FF&E, pre-opening)" value={fmtAedExact(c.constructionAed + c.equipmentAed + c.preOpeningAed)} />
              <ResultRow label={c.kind === 'psf' && core.mode === 'bts' ? 'Gross sales' : 'Value at exit'} value={fmtAedExact(c.exitValueAed)} />
              <ResultRow label="Contribution before land & project costs" value={fmtAedExact(c.contributionAed)} />
            </div>
          ))}
        </>
      )}

      {jv && (
        <>
          <div style={{ height: 14 }} />
          <SectionTitle>Joint venture</SectionTitle>
          <ResultRow label="Land contributed (agreed value)" value={fmtAedExact(jv.landValueAed)} />
          <ResultRow label={`Landowner share${jv.shareIsDerived ? ' (derived from capital)' : jv.type === 'revenue_share' ? ' of revenue' : ' of profit'}`} value={`${jv.landownerSharePct.toFixed(1)}%`} />
          <ResultRow label="Landowner receives" value={fmtAedExact(jv.landowner.receiptsAed)} bold />
          <ResultRow label="Landowner gain over land value" value={fmtAedExact(jv.landowner.profitAed)} />
          <ResultRow label="Landowner IRR" value={pctOrDash(jv.landowner.irrPct)} />
          <ResultRow label="Developer funds (peak)" value={fmtAedExact(jv.developer.peakFundingAed)} />
          <ResultRow label="Developer profit" value={fmtAedExact(jv.developer.profitAed)} bold />
          <ResultRow label="Developer IRR" value={pctOrDash(jv.developer.irrPct)} />
          {jv.entitlementCapped && <Note tone="amber">The project cannot pay the landowner&apos;s full entitlement — receipts are capped at what it generates.</Note>}
          {jv.breakevenSharePct != null && (
            <Note>
              Break-even share: at {jv.breakevenSharePct.toFixed(1)}% the landowner&apos;s JV receipts, discounted at {inputs.discountRatePct}%, equal selling the land today.
            </Note>
          )}
          {!jv.shareIsDerived && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: DIM, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Sell today vs JV</div>
              {jv.sellVsJv.map((r) => (
                <ResultRow
                  key={r.sharePct}
                  label={`${r.sharePct}% share → receives ${fmtAed(r.landownerReceiptsAed)}`}
                  value={`${r.vsSellAed >= 0 ? '+' : ''}${fmtAed(r.vsSellAed)} · PV ${r.vsSellPvAed >= 0 ? '+' : ''}${fmtAed(r.vsSellPvAed)}`}
                />
              ))}
              <Note>Receipts include the return of the land value. The second figure discounts them to today at {inputs.discountRatePct}%.</Note>
            </div>
          )}
        </>
      )}

      {model.sensitivity && (
        <>
          <div style={{ height: 14 }} />
          <SectionTitle>Sensitivity — IRR</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(3, 1fr)', gap: 4, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
            <div />
            {model.sensitivity.revenueSteps.map((s) => (
              <div key={s} style={{ color: DIM, textAlign: 'right' }}>
                Revenue {s > 0 ? '+' : ''}{s}%
              </div>
            ))}
            {model.sensitivity.costSteps.map((cs, ci) => (
              <div key={cs} style={{ display: 'contents' }}>
                <div style={{ color: DIM }}>Build cost {cs > 0 ? '+' : ''}{cs}%</div>
                {model.sensitivity!.irrPct[ci].map((v, ri) => (
                  <div key={ri} style={{ textAlign: 'right', color: cs === 0 && model.sensitivity!.revenueSteps[ri] === 0 ? GOLD : TXT, fontWeight: cs === 0 && model.sensitivity!.revenueSteps[ri] === 0 ? 700 : 400 }}>
                    {pctOrDash(v)}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {model.breakEvenRevenueFactor != null && (
            <Note>
              Breaks even at {(model.breakEvenRevenueFactor * 100).toFixed(0)}% of the revenue assumed
              {core.mode === 'bts' && leadEngine.kind === 'psf' && !isMixed ? ` (AED ${fmtInt(lead.salesPsfSfa * model.breakEvenRevenueFactor)}/sqft)` : ''}.
            </Note>
          )}
          {model.residualLand && (
            <Note>
              Land cost at which this deal reaches a {model.residualLand.targetIrrPct}% IRR:{' '}
              {model.residualLand.atTargetIrrAed != null ? fmtAedExact(model.residualLand.atTargetIrrAed) : 'not reachable at any land price'}
              {model.residualLand.atBreakevenAed != null ? ` · breaks even at ${fmtAedExact(model.residualLand.atBreakevenAed)}` : ''}. A result of this model, not a valuation of the plot.
            </Note>
          )}
        </>
      )}
      <Note>{model.modelStamp}</Note>
    </>
  );

  // ── Layout ─────────────────────────────────────────────────────────────
  const shellStyle: React.CSSProperties = {
    background: 'rgba(10, 22, 40, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    color: TXT,
    boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
    padding: 20,
  };
  const outerStyle: React.CSSProperties = side
    ? { color: TXT, fontFamily: '-apple-system, Segoe UI, Roboto, sans-serif' }
    : {
        minHeight: '100vh',
        background: `radial-gradient(circle at 20% 0%, ${NAVY} 0%, #0A1428 60%, #050912 100%)`,
        padding: '24px 24px 64px 24px',
        color: TXT,
        fontFamily: '-apple-system, Segoe UI, Roboto, sans-serif',
      };

  const pdfBlocked = model.status === 'blocked';
  const exportPdf = () => {
    if (pdfBlocked) return;
    downloadFeasibilityPdf({ parcel, inputs: dInputs, baseline, model, farIsUserInput });
  };

  const tabBtn = (key: Mode) => {
    const active = tab === key;
    return (
      <button
        type="button"
        key={key}
        onClick={() => update((p) => ({ ...p, mode: key }))}
        aria-pressed={active}
        style={{
          flex: 1,
          padding: '10px 8px',
          background: active ? 'rgba(200,169,110,0.18)' : 'transparent',
          border: `1px solid ${active ? GOLD : LINE}`,
          borderRadius: 6,
          color: active ? GOLD : DIM,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
        }}
      >
        {MODE_LABEL[key]}
      </button>
    );
  };

  const landUseLabel = parcel.landUse || 'Land use not on record';
  const facts = `${fmtInt(parcel.plotAreaSqft)} sqft · ${area ? `FAR ${area.far.toFixed(2)} · GFA ${fmtInt(area.gfaSqft)} sqft` : 'FAR unknown'} · ${
    parcel.landPriceKnown ? `Price on record ${fmtAedExact(parcel.plotPriceAed)}` : 'No price on record'
  }`;
  const engineLabel = isMixed ? 'per use (mixed)' : leadEngine.label;
  const selector = (
    <EngineSelector value={lead.engineId} onChange={setEngine} availableEngines={availableEngines} disabled={isMixed} disabledNote={engineSelectorNote} />
  );

  return (
    <div style={outerStyle}>
      {banner === 'preview' && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'rgba(230, 57, 70, 0.95)',
            color: TXT,
            padding: '8px 16px',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
          }}
          role="alert"
          aria-live="polite"
        >
          Internal preview · feasibility v6.1 · do not share externally
        </div>
      )}

      <div style={{ maxWidth: side ? '100%' : 1280, margin: '0 auto', padding: side ? 0 : '24px 0 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: side ? 12 : 20 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: side ? 16 : 22, fontWeight: 700, color: GOLD, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Feasibility Calculator
          </div>
          <button
            disabled={pdfBlocked}
            type="button"
            onClick={exportPdf}
            title={pdfBlocked ? model.blockers[0]?.title : 'Download the report as a PDF'}
            style={{
              background: 'rgba(200,169,110,0.18)',
              border: `1px solid ${pdfBlocked ? LINE : GOLD}`,
              color: pdfBlocked ? SUBTLE : GOLD,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: pdfBlocked ? 'not-allowed' : 'pointer',
              transition: 'background 150ms ease, border-color 150ms ease',
            }}
          >
            {pdfBlocked ? 'Export PDF — no result yet' : 'Export PDF'}
          </button>
        </div>

        <StudiesBar
          parcel={parcel}
          vaultEntryId={vaultEntryId}
          // Undebounced on purpose: "Save version" must freeze what is on
          // screen, not the state from before the last keystroke.
          inputs={inputs}
          dirty={dirty}
          compact={side}
          onLoad={(loaded) => {
            setInputs(loaded);
            setDirty(false);
          }}
        />

        {side ? (
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: TXT, fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3, marginBottom: 2 }}>
              Plot {parcel.plotNumber} <span style={{ color: SUBTLE, fontWeight: 400 }}>· {parcel.district} · {landUseLabel}</span>
            </div>
            <div style={{ color: SUBTLE, fontSize: 11, marginBottom: 8 }}>{facts}</div>
            <EngineSelectorDisclosure currentLabel={engineLabel} currentValidated={isMixed ? true : leadEngine.validated} inert={isMixed}>
              {selector}
            </EngineSelectorDisclosure>
          </div>
        ) : (
          <div style={{ ...shellStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <SectionTitle>Parcel</SectionTitle>
              <div style={{ color: TXT, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>Plot {parcel.plotNumber}</div>
              <div style={{ color: SUBTLE, fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
                <div>
                  {parcel.district}
                  {parcel.community ? ` · ${parcel.community}` : ''}
                </div>
                {parcel.projectName && <div>Project: {parcel.projectName}</div>}
                {parcel.masterDeveloper && <div>Master developer: {parcel.masterDeveloper}</div>}
                <div>Land use: {landUseLabel}{route.kind === 'not_developable' ? ' — not a development class' : ''}</div>
                <div>{facts}</div>
              </div>
            </div>
            {selector}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>{(['bts', 'btr', 'jv'] as Mode[]).map(tabBtn)}</div>

        {side ? (
          <>
            {hero}
            {inputPanels}
            {results && (
              <Panel title="Detail" metric={core ? `Total inv ${fmtAed(core.totalCostAed)}` : undefined}>
                {results}
              </Panel>
            )}
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
            <div>{inputPanels}</div>
            <div>
              {hero}
              {results && <div style={shellStyle}>{results}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
