// ZAAHI Feasibility v6.1 — the PDF report.
//
// Rendered from the SAME FeasibilityModel object the screen shows. It holds no
// arithmetic of its own: every investment and revenue row is an element of
// `core.costLines` / `core.revenueLines`, and each total printed under them is
// the model's sum of those rows. That is the structural fix for audit B8,
// where the old PDF took line items from the single-engine model and totals
// from the mixed-use one ("40.0M + 1.6M + 83.4M = 142.6M").
//
// Layout (A4 portrait): cover · assumptions vs defaults · use mix · investment,
// revenue and returns · cashflow · sensitivity · joint venture · what is not
// included · basis of assumptions · glossary · disclaimer.
//
// Client-only (jsPDF).

import { ENGINES, PROJECT_PROV, type EngineParams, type ProvKey } from './engines';
import type { ParcelInput } from './parcelInput';
import { computeFeasibility, type FeasibilityModel, type StudyInputs, type ComponentInputs, type CoreResult } from './model';
import { verdictBandsText } from './verdict';
import { createPdfKit, hexToRgb, pdfAed, pdfInt, pdfPct, PDF_COLORS as C, type PdfKit, type RGB } from './pdfKit';

const MODE_LABEL = { bts: 'Build to Sell', btr: 'Build to Rent', jv: 'Joint Venture' } as const;

/** What a real feasibility would also carry and this model does not. */
export const NOT_INCLUDED: string[] = [
  'Corporate tax (9% on taxable profit) - all figures are pre-tax.',
  'The 4% DLD / Oqood registration fee on unit sales, which the buyer pays by convention. If you absorb it as a sales incentive, add it to Developer services.',
  'The RERA pre-sales guarantee (a bank guarantee or cash deposit against construction cost before off-plan sales can launch) and its cost.',
  'Escalation of construction prices during the build, and inflation of costs generally.',
  'Tenant incentives, leasing commissions and fit-out contributions on let space.',
  'Working capital, debt-service reserves, loan arrangement fees and hedging.',
  'Master-developer NOC, community and infrastructure charges specific to this plot.',
  'VAT cashflow timing (VAT is treated as recoverable unless you enter an irrecoverable percentage).',
  'Site-specific risks: ground conditions, height or setback restrictions beyond the FAR, utility capacity.',
];

interface FieldRow {
  label: string;
  value: number;
  base: number | null;
  fmt: (n: number) => string;
  /** Returns the study with this one field put back to its default. */
  reset?: (i: StudyInputs) => StudyInputs;
}

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const dec = (d: number) => (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: d });
const pct = (n: number) => `${dec(2)(n)}%`;

function componentFields(c: ComponentInputs, b: ComponentInputs | undefined, base: 'bts' | 'btr', idx = 0): FieldRow[] {
  const eng = ENGINES[c.engineId];
  const same = b && b.engineId === c.engineId ? b : undefined;
  const f = (label: string, key: Exclude<keyof EngineParams, 'rampPct'>, fmt: (n: number) => string): FieldRow => ({
    label,
    value: c[key],
    base: same ? same[key] : null,
    fmt,
    reset: same ? (i) => ({ ...i, components: i.components.map((x, j) => (j === idx ? { ...x, [key]: same[key] } : x)) }) : undefined,
  });
  const rows: FieldRow[] = [f('BUA / GFA (incl. parking)', 'buaGfaRatio', dec(2)), f('Efficiency (SFA / GFA)', 'efficiencyPct', pct)];
  if (c.capexPerUnitAed > 0) rows.push(f(`Capex per ${eng.unitLabel || 'unit'}`, 'capexPerUnitAed', aed));
  if (c.constructionPsfGfa > 0) rows.push(f('Construction, per sqft GFA', 'constructionPsfGfa', aed));
  if (c.buaGfaRatio > 1) rows.push(f('Parking & basements, per sqft', 'parkingPsf', aed));
  if (c.brandPsfGfa > 0) rows.push(f('Brand premium, per sqft GFA', 'brandPsfGfa', aed));
  rows.push(f('Infrastructure, per sqft GFA', 'infrastructurePsfGfa', aed), f('Consultancy', 'consultancyPct', pct), f('Contingency', 'contingencyPct', pct));
  if (eng.kind === 'operating') {
    rows.push(
      f(`FF&E / equipment per ${eng.unitLabel.replace(/s$/, '')}`, 'equipmentPerUnitAed', aed),
      f(`Pre-opening per ${eng.unitLabel.replace(/s$/, '')}`, 'preOpeningPerUnitAed', aed),
      f(eng.revenueBasis === 'night' ? 'ADR (per night)' : `Revenue per ${eng.unitLabel.replace(/s$/, '')} per year`, 'revenuePerUnit', aed),
    );
    if (eng.revenueBasis === 'night') rows.push(f('Non-room revenue (% of rooms)', 'otherRevenuePct', pct));
    rows.push(f('Occupancy / utilisation', 'occupancyPct', pct), f('Operating costs (% of revenue)', 'operatingPct', pct), f('Income to property owner (% of EBITDA)', 'propertyIncomeSharePct', pct), f('Exit cap rate', 'exitCapRatePct', pct));
  } else if (base === 'bts') {
    rows.push(f('Sale price, per sqft SFA', 'salesPsfSfa', aed));
  } else {
    rows.push(f('Rent, per sqft SFA per year', 'rentPsfSfaYear', aed), f('Occupancy', 'occupancyPct', pct), f('Operating costs (% of rent)', 'operatingPct', pct), f('Exit cap rate', 'exitCapRatePct', pct));
  }
  return rows;
}

function projectFields(i: StudyInputs, b: StudyInputs, base: 'bts' | 'btr', core: CoreResult): FieldRow[] {
  const rows: FieldRow[] = [
    { label: 'Design + permits (months)', value: i.programme.preConstructionMonths, base: b.programme.preConstructionMonths, fmt: dec(0) },
    { label: 'Construction (months)', value: i.programme.constructionMonths, base: b.programme.constructionMonths, fmt: dec(0) },
    { label: 'Authority & utility fees (% of construction)', value: i.softCosts.authorityFeesPct, base: b.softCosts.authorityFeesPct, fmt: pct },
    { label: 'Developer overhead / PM (% of construction)', value: i.softCosts.developerOverheadPct, base: b.softCosts.developerOverheadPct, fmt: pct },
    { label: 'Land holding cost (% of land p.a.)', value: i.softCosts.landHoldingPctPa, base: b.softCosts.landHoldingPctPa, fmt: pct },
    { label: 'Irrecoverable VAT (% of construction)', value: i.softCosts.irrecoverableVatPct, base: b.softCosts.irrecoverableVatPct, fmt: pct },
  ];
  const hasSales = core.revenueLines.some((l) => l.id === 'sales');
  if (base === 'bts' && hasSales) {
    rows.push(
      { label: 'Sales commission', value: i.sales.commissionPct, base: b.sales.commissionPct, fmt: pct },
      { label: 'Marketing', value: i.sales.marketingPct, base: b.sales.marketingPct, fmt: pct },
      { label: 'Sell-out after handover (months)', value: i.sales.selloutMonthsAfterHandover, base: b.sales.selloutMonthsAfterHandover, fmt: dec(0) },
      { label: 'Service charge on unsold stock (AED/sqft/yr)', value: i.softCosts.serviceChargeUnsoldPsfYear, base: b.softCosts.serviceChargeUnsoldPsfYear, fmt: dec(1) },
    );
    if (i.sales.offPlan) {
      rows.push(
        { label: 'Off-plan: sold at launch', value: i.sales.soldAtLaunchPct, base: b.sales.soldAtLaunchPct, fmt: pct },
        { label: 'Off-plan: sold by handover', value: i.sales.soldByHandoverPct, base: b.sales.soldByHandoverPct, fmt: pct },
        { label: 'Off-plan: paid by buyers before handover', value: i.sales.paidDuringConstructionPct, base: b.sales.paidDuringConstructionPct, fmt: pct },
        { label: 'RERA registration & escrow fees', value: i.softCosts.reraFeesAed, base: b.softCosts.reraFeesAed, fmt: aed },
      );
    }
  }
  if (core.revenueLines.some((l) => l.id === 'assetsale')) rows.push({ label: 'Asset sale costs', value: i.sales.assetSaleFeePct, base: b.sales.assetSaleFeePct, fmt: pct });
  if (base === 'btr') {
    rows.push(
      { label: 'Hold period (years)', value: i.rental.holdYears, base: b.rental.holdYears, fmt: dec(0) },
      { label: 'Exit selling costs', value: i.rental.exitSaleCostPct, base: b.rental.exitSaleCostPct, fmt: pct },
    );
  }
  if (core.stabilisedNoiAed > 0) rows.push({ label: 'Income growth (% p.a.)', value: i.rental.rentGrowthPct, base: b.rental.rentGrowthPct, fmt: pct });
  rows.push({ label: 'Discount rate for NPV', value: i.discountRatePct, base: b.discountRatePct, fmt: pct });
  return rows;
}

function fieldTable(kit: PdfKit, rows: FieldRow[]) {
  const diffs = rows.map((r) => (r.base != null && r.base !== 0 && r.value !== r.base ? ((r.value - r.base) / r.base) * 100 : null));
  kit.table({
    head: ['Assumption', 'This study', 'Default', 'Diff'],
    widths: [0.5, 0.2, 0.2, 0.1],
    rows: rows.map((r, i) => [r.label, r.fmt(r.value), r.base == null ? '-' : r.fmt(r.base), diffs[i] == null ? '' : `${diffs[i]! > 0 ? '+' : ''}${diffs[i]!.toFixed(0)}%`]),
    cellColor: (ri, ci) => {
      if (ci !== 3 || diffs[ri] == null) return undefined;
      const a = Math.abs(diffs[ri]!);
      return a <= 15 ? C.green : a <= 30 ? C.amber : C.red;
    },
    boldCell: (ri, ci) => ci === 3 && diffs[ri] != null,
  });
}

function lineTable(kit: PdfKit, lines: Array<{ label: string; aed: number; basis?: string }>, totalLabel: string, total: number, totalColor?: RGB) {
  let tint = false;
  for (const l of lines) {
    kit.row(l.aed < 0 ? `- ${l.label}` : l.label, pdfAed(l.aed), { tint, note: l.basis });
    tint = !tint;
  }
  kit.row(`= ${totalLabel}`, pdfAed(total), { bold: true, tint, valueColor: totalColor ?? C.goldDark });
}

/** Net equity cashflow by quarter, with the cumulative position drawn over it. */
function cashflowChart(kit: PdfKit, core: CoreResult) {
  const { doc, M, W } = kit;
  const quarters: Array<{ q: number; net: number; cum: number }> = [];
  for (const r of core.monthly) {
    const q = Math.floor(Math.max(0, r.month - 1) / 3) + (r.month === 0 ? 0 : 1);
    const slot = quarters[q] ?? (quarters[q] = { q, net: 0, cum: 0 });
    slot.net += r.netAed;
    slot.cum = r.cumulativeAed;
  }
  const data = quarters.filter(Boolean);
  if (data.length < 2) return;
  const h = 46;
  kit.ensure(h + 16);
  const x0 = M + 2;
  const w = W - 2 * M - 4;
  const top = kit.y;
  const maxAbs = Math.max(1, ...data.map((d) => Math.max(Math.abs(d.net), Math.abs(d.cum))));
  const zero = top + h / 2;
  const scale = (h / 2 - 2) / maxAbs;
  const bw = w / data.length;
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.2);
  doc.line(x0, zero, x0 + w, zero);
  data.forEach((d, i) => {
    doc.setFillColor(...(d.net >= 0 ? C.green : C.red));
    const bh = Math.abs(d.net) * scale;
    doc.rect(x0 + i * bw + bw * 0.15, d.net >= 0 ? zero - bh : zero, bw * 0.7, Math.max(0.2, bh), 'F');
  });
  doc.setDrawColor(...C.goldDark);
  doc.setLineWidth(0.5);
  for (let i = 1; i < data.length; i++) {
    doc.line(x0 + (i - 0.5) * bw, zero - data[i - 1].cum * scale, x0 + (i + 0.5) * bw, zero - data[i].cum * scale);
  }
  // Handover marker.
  const hq = Math.floor(Math.max(0, core.timeline.handoverMonth - 1) / 3) + 1;
  const hx = x0 + (hq + 0.5) * bw;
  if (hx < x0 + w) {
    doc.setDrawColor(...C.gray);
    doc.setLineWidth(0.2);
    doc.line(hx, top, hx, top + h);
    doc.setFontSize(6.5);
    doc.setTextColor(...C.gray);
    doc.setFont('helvetica', 'normal');
    doc.text('handover', hx + 1, top + 3);
  }
  kit.y = top + h + 4;
  kit.para(`Bars: net equity cashflow per quarter (green in, red out). Line: cumulative equity position. Largest value on the scale: ${pdfAed(maxAbs)}.`, { size: 7.5, color: C.gray, italic: true });
}

/**
 * "Where this study departs from the defaults" (the v6.0 report's
 * "Optimisation recommendations", rebuilt on the single model).
 *
 * For every input 15% or more away from its default, the model is re-run with
 * that one input put back, and the change in net profit is reported. The
 * figure is therefore the model's own answer, not a side calculation.
 */
function deviationNotes(a: FeasibilityPdfArgs, core: CoreResult): string[] {
  const out: Array<{ text: string; mag: number }> = [];
  a.inputs.components.forEach((c, i) => {
    for (const r of componentFields(c, a.baseline.components[i], core.mode, i)) {
      if (!r.reset || r.base == null || r.base === 0) continue;
      const diff = ((r.value - r.base) / r.base) * 100;
      if (Math.abs(diff) < 15) continue;
      const alt = computeFeasibility(r.reset(a.inputs), { farIsUserInput: a.farIsUserInput, light: true });
      if (!alt.core) continue;
      const delta = alt.core.profitAed - core.profitAed;
      if (Math.abs(delta) < 1) continue;
      const who = a.inputs.components.length > 1 ? `${c.label}: ` : '';
      out.push({
        mag: Math.abs(delta),
        text:
          `${who}${r.label} is ${r.fmt(r.value)}, ${Math.abs(diff).toFixed(0)}% ${diff > 0 ? 'above' : 'below'} the default of ${r.fmt(r.base)}. ` +
          `At the default, net profit would be ${pdfAed(Math.abs(delta))} ${delta > 0 ? 'higher' : 'lower'}. ` +
          (delta > 0 ? 'Worth testing against a second quote or comparable.' : 'Make sure the evidence for this figure is on file.'),
      });
    }
  });
  return out.sort((x, y) => y.mag - x.mag).slice(0, 8).map((x) => x.text);
}

export interface FeasibilityPdfArgs {
  parcel: ParcelInput;
  inputs: StudyInputs;
  /** The defaults the study started from, for the "vs default" column. */
  baseline: StudyInputs;
  model: FeasibilityModel;
  preparedFor?: string;
  /** Name of the saved study / version, when exported from one. */
  studyName?: string;
  /** True when the FAR was typed by the user because the plan has none. */
  farIsUserInput?: boolean;
}

/** Build the report. Returns null for a blocked model — there is nothing to report. */
export function buildFeasibilityPdf(a: FeasibilityPdfArgs): { kit: PdfKit; fileName: string } | null {
  const { parcel, inputs, baseline, model } = a;
  const core = model.core;
  if (model.status !== 'ok' || !core || !model.verdict) return null;
  const jv = model.jv;
  const base = core.mode;
  const kit = createPdfKit('portrait');
  const { doc, M, W, H } = kit;
  const dateStr = new Date().toISOString().slice(0, 10);
  const lead = [...inputs.components].sort((x, y) => y.sharePct - x.sharePct)[0];
  const research = inputs.components.some((c) => !ENGINES[c.engineId].validated);

  // ═══ Cover ═══════════════════════════════════════════════════════════
  kit.newPage();
  kit.y = 24;
  doc.setFontSize(28);
  doc.setTextColor(...C.goldDark);
  doc.setFont('times', 'bold');
  doc.text('ZAAHI', M, kit.y);
  doc.setFontSize(8);
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'normal');
  doc.text('DEVELOPMENT FEASIBILITY STUDY', M, kit.y + 5);
  doc.text(`${dateStr}`, W - M, kit.y, { align: 'right' });
  if (a.preparedFor) doc.text(`Prepared for: ${a.preparedFor}`, W - M, kit.y + 5, { align: 'right' });
  kit.y += 13;
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.5);
  doc.line(M, kit.y, W - M, kit.y);
  kit.y += 8;

  doc.setFontSize(14);
  doc.setTextColor(...C.dark);
  doc.setFont('times', 'bold');
  doc.text(`Plot ${parcel.plotNumber}`, M, kit.y);
  kit.y += 6;
  kit.para([parcel.district, parcel.community, parcel.projectName].filter(Boolean).join(' - '), { color: C.gray });
  kit.para(
    `${parcel.landUse || 'Land use not on record'} - plot ${pdfInt(core.areas.plotAreaSqft)} sqft - FAR ${core.areas.far.toFixed(2)} (${core.areas.farSource}) - GFA ${pdfInt(core.areas.gfaSqft)} sqft (${core.areas.gfaSource})`,
    { color: C.gray },
  );
  const landCost = jv ? jv.landValueAed : inputs.land.costAed ?? 0;
  const landIsRecord = parcel.landPriceKnown && Math.abs(parcel.plotPriceAed - landCost) < 1;
  kit.para(
    `${jv ? 'Land value contributed' : 'Land cost'} (${landIsRecord ? 'price on record' : 'user input'}): ${pdfAed(landCost)}` +
      (!landIsRecord ? (parcel.landPriceKnown ? ` - price on record ${pdfAed(parcel.plotPriceAed)}` : ' - no price on record for this plot') : ''),
    { color: C.dark, bold: true },
  );
  kit.para(`Mode: ${MODE_LABEL[inputs.mode]}${jv ? ` (${jv.baseMode === 'bts' ? 'sale' : 'hold'} economics)` : ''}${core.escrow ? ' - off-plan sales through escrow' : ''}${a.studyName ? ` - study: ${a.studyName}` : ''}`, { size: 8.5, color: C.gray });
  kit.para(model.modelStamp, { size: 8.5, color: C.gray });
  if (research) {
    kit.para('RESEARCH DEFAULTS, NOT VALIDATED. One or more engines in this study use research defaults that the founder has not yet ratified. See "Basis of assumptions".', { size: 8.5, color: C.amber, bold: true });
  }
  kit.gap(8);

  const heroLabel = inputs.mode === 'bts' ? 'NET PROFIT' : inputs.mode === 'btr' ? 'YIELD ON COST' : 'PROJECT PROFIT';
  const heroValue = inputs.mode === 'btr' ? pdfPct(core.yieldOnCostPct) : pdfAed(core.profitAed);
  const heroGood = inputs.mode === 'btr' ? core.yieldOnCostPct >= 5 : core.profitAed >= 0;
  doc.setFontSize(8);
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'normal');
  doc.text(heroLabel, M, kit.y);
  kit.y += 15;
  doc.setFontSize(34);
  doc.setTextColor(...(heroGood ? C.goldDark : C.red));
  doc.setFont('times', 'bold');
  doc.text(heroValue, M, kit.y);
  kit.y += 11;

  const tiles: Array<[string, string]> =
    inputs.mode === 'btr'
      ? [['IRR', pdfPct(core.irrPct)], ['Stabilised NOI', pdfAed(core.stabilisedNoiAed)], ['Total investment', pdfAed(core.totalCostAed)], ['Peak equity', pdfAed(core.peakEquityAed)]]
      : [['IRR', pdfPct(core.irrPct)], ['ROI', pdfPct(core.roiPct)], ['Total investment', pdfAed(core.totalCostAed)], ['Peak equity', pdfAed(core.peakEquityAed)]];
  const tw = (W - 2 * M) / tiles.length;
  tiles.forEach(([k, v], i) => {
    doc.setFontSize(7.5);
    doc.setTextColor(...C.gray);
    doc.setFont('helvetica', 'normal');
    doc.text(k.toUpperCase(), M + i * tw, kit.y);
    doc.setFontSize(11);
    doc.setTextColor(...C.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(v, M + i * tw, kit.y + 5.5);
  });
  kit.y += 14;

  const vColor = hexToRgb(model.verdict.color);
  doc.setDrawColor(...vColor);
  doc.setFillColor(...C.cream);
  doc.setLineWidth(0.4);
  doc.rect(M, kit.y, W - 2 * M, 10, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(...vColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`VERDICT - ${model.verdict.label.replace(/[–—]/g, '-').toUpperCase()}`, W / 2, kit.y + 6.5, { align: 'center' });
  kit.y += 15;
  kit.para(model.verdict.banded ? `Band: ${model.verdict.threshold}. ${verdictBandsText()}` : model.verdict.threshold, { size: 8, color: C.gray });

  if (model.caveats.length > 0) {
    kit.gap(2);
    kit.subhead('Read before relying on this study');
    for (const c of model.caveats) kit.para(`- ${c}`, { size: 8.5, color: C.amber });
  }
  doc.setFontSize(8);
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'italic');
  doc.text('A feasibility estimate, not a valuation. See the last page for the disclaimer and what is not included.', M, H - 16);

  // ═══ Assumptions ═════════════════════════════════════════════════════
  kit.newPage();
  kit.sectionTitle('Assumptions');
  kit.para('Every input this study used, next to the default it started from. Diff is green up to 15%, amber to 30%, red beyond.', { size: 8, color: C.gray, italic: true });

  if (inputs.components.length > 1) {
    kit.subhead('Use mix');
    kit.table({
      head: ['Use', 'Engine', 'Share', 'GFA sqft', 'Units', 'Build cost', base === 'bts' ? 'Sales / value' : 'Value at exit', 'Contribution'],
      widths: [0.2, 0.14, 0.08, 0.1, 0.09, 0.13, 0.13, 0.13],
      size: 7.5,
      rows: core.components.map((c) => [
        c.label,
        c.engineLabel,
        `${c.sharePct.toFixed(1)}%`,
        pdfInt(c.gfaSqft),
        c.units > 0 ? `${pdfInt(c.units)} ${c.unitLabel}` : '-',
        pdfInt(c.constructionAed + c.equipmentAed + c.preOpeningAed),
        pdfInt(c.exitValueAed),
        pdfInt(c.contributionAed),
      ]),
    });
    kit.para('Contribution = value net of selling costs, less build cost, before land and project-level costs. Amounts in AED.', { size: 7.5, color: C.gray, italic: true });
  }

  inputs.components.forEach((c, i) => {
    kit.subhead(inputs.components.length > 1 ? `${c.label} - ${ENGINES[c.engineId].label} (${c.sharePct.toFixed(1)}% of GFA)` : `${ENGINES[c.engineId].label} engine`);
    fieldTable(kit, componentFields(c, baseline.components[i], base, i));
    if (c.rampPct.length > 0 && (ENGINES[c.engineId].kind === 'operating' || base === 'btr')) {
      kit.para(`Ramp-up: income at ${c.rampPct.join(' / ')}% of stabilised in operating years 1-${c.rampPct.length}, 100% afterwards.`, { size: 8, color: C.gray });
    }
  });
  kit.subhead('Project');
  fieldTable(kit, projectFields(inputs, baseline, base, core));
  if (inputs.finance.enabled && inputs.finance.loanAed > 0) {
    kit.para(
      `Finance: loan ${pdfAed(inputs.finance.loanAed)} at ${inputs.finance.ratePct}% p.a., drawn against construction, interest rolled up on the drawn balance` +
        (base === 'btr' ? (inputs.rental.debtAtHandover === 'refinance' ? `, refinanced at handover into an interest-only term loan at ${inputs.rental.termRatePct}% and repaid at exit.` : ', repaid from equity at handover.') : ', repaid from the first sale proceeds.'),
      { size: 8.5 },
    );
  }
  if (inputs.land.paymentMode === 'installments' && !jv) {
    kit.para(`Land paid ${inputs.land.downPaymentPct}% down, balance in equal monthly instalments over ${inputs.land.installmentMonths} months.`, { size: 8.5 });
  }

  // ═══ Results ═════════════════════════════════════════════════════════
  kit.newPage();
  kit.sectionTitle('Results');
  kit.subhead('Areas');
  kit.row('Plot area', `${pdfInt(core.areas.plotAreaSqft)} sqft`);
  kit.row(`GFA (${core.areas.gfaSource})`, `${pdfInt(core.areas.gfaSqft)} sqft`, { tint: true, bold: true });
  kit.row('BUA (incl. parking and basements)', `${pdfInt(core.areas.buaSqft)} sqft`);
  kit.row('SFA (saleable / leasable)', `${pdfInt(core.areas.sfaSqft)} sqft`, { tint: true });
  kit.gap(3);

  kit.subhead('Investment');
  lineTable(kit, core.costLines, 'Total investment', core.totalCostAed);
  kit.gap(3);
  kit.subhead(base === 'bts' ? 'Revenue' : 'Income and exit');
  lineTable(kit, core.revenueLines, 'Net revenue', core.netRevenueAed);
  kit.gap(3);

  kit.subhead('Returns');
  kit.row('= Net profit (net revenue - total investment)', pdfAed(core.profitAed), { bold: true, tint: true, valueColor: core.profitAed >= 0 ? C.goldDark : C.red });
  kit.row('ROI (net profit / total investment)', pdfPct(core.roiPct));
  kit.row('Margin on gross development value', pdfPct(core.marginOnGdvPct), { tint: true });
  kit.row(`IRR (annualised, on equity; ${core.timeline.endMonth} months of cashflow)`, pdfPct(core.irrPct), { bold: true });
  kit.row('Peak equity (largest cumulative outlay)', pdfAed(core.peakEquityAed), { tint: true });
  kit.row('Equity multiple', `${core.equityMultiple.toFixed(2)}x`);
  kit.row(`NPV at ${inputs.discountRatePct}%`, pdfAed(core.npvAed), { tint: true });
  if (core.stabilisedNoiAed > 0 && (base === 'btr' || core.components.some((c) => c.kind === 'operating'))) {
    kit.row('Stabilised net operating income, per year', pdfAed(core.stabilisedNoiAed));
    kit.row('Yield on cost (stabilised NOI / total investment)', pdfPct(core.yieldOnCostPct), { tint: true });
    if (base === 'btr') kit.row('Payback on income', Number.isFinite(core.paybackYears) ? `${core.paybackYears.toFixed(1)} years` : 'not within 100 years');
  }
  if (core.escrow) {
    kit.gap(3);
    kit.subhead('Escrow account (Dubai Law 8 of 2007)');
    kit.row('Buyer receipts into escrow', pdfAed(core.escrow.receiptsAed));
    kit.row('Drawn for construction', pdfAed(core.escrow.drawnAed), { tint: true });
    kit.row('Released to the developer at handover', pdfAed(core.escrow.releasedAtHandoverAed));
    kit.row(`Retention (Art. 14), released month ${core.escrow.retentionReleaseMonth}`, pdfAed(core.escrow.retentionAed), { tint: true });
  }

  // ═══ Cashflow ════════════════════════════════════════════════════════
  kit.gap(4);
  kit.ensure(95);
  kit.sectionTitle('Cashflow');
  kit.para(
    `Land at month 0. Design and permits months 1-${core.timeline.preConstructionMonths}. Construction months ${core.timeline.preConstructionMonths + 1}-${core.timeline.handoverMonth}. Handover month ${core.timeline.handoverMonth}. Last cash event month ${core.timeline.endMonth}.`,
    { size: 8.5 },
  );
  cashflowChart(kit, core);
  const years: Array<{ y: number; costs: number; inflows: number; debt: number; net: number; cum: number }> = [];
  for (const r of core.monthly) {
    const y = r.month === 0 ? 0 : Math.ceil(r.month / 12);
    const s = years[y] ?? (years[y] = { y, costs: 0, inflows: 0, debt: 0, net: 0, cum: 0 });
    s.costs += r.costsAed;
    s.inflows += r.inflowsAed;
    s.debt += r.debtDrawAed - r.debtServiceAed;
    s.net += r.netAed;
    s.cum = r.cumulativeAed;
  }
  kit.table({
    head: ['Period', 'Costs', 'Receipts', 'Debt (draw - service)', 'Net to equity', 'Cumulative'],
    widths: [0.16, 0.168, 0.168, 0.168, 0.168, 0.168],
    size: 7.5,
    rows: years.filter(Boolean).map((s) => [s.y === 0 ? 'Month 0' : `Year ${s.y}`, pdfInt(-s.costs), pdfInt(s.inflows), pdfInt(s.debt), pdfInt(s.net), pdfInt(s.cum)]),
    cellColor: (ri, ci) => (ci === 4 ? (years.filter(Boolean)[ri].net >= 0 ? C.green : C.red) : undefined),
  });
  kit.para('Receipts include amounts an escrow account paid directly to the contractor. Amounts in AED.', { size: 7.5, color: C.gray, italic: true });

  // ═══ Sensitivity ═════════════════════════════════════════════════════
  if (model.sensitivity) {
    const s = model.sensitivity;
    kit.gap(3);
    kit.sectionTitle('Sensitivity');
    kit.table({
      head: ['IRR', ...s.revenueSteps.map((x) => `Revenue ${x > 0 ? '+' : ''}${x}%`)],
      widths: [0.34, 0.22, 0.22, 0.22],
      rows: s.costSteps.map((cs, ci) => [`Build cost ${cs > 0 ? '+' : ''}${cs}%`, ...s.irrPct[ci].map((v) => pdfPct(v))]),
      boldCell: (ri, ci) => s.costSteps[ri] === 0 && ci > 0 && s.revenueSteps[ci - 1] === 0,
    });
    kit.table({
      head: ['Net profit, AED', ...s.revenueSteps.map((x) => `Revenue ${x > 0 ? '+' : ''}${x}%`)],
      widths: [0.34, 0.22, 0.22, 0.22],
      rows: s.costSteps.map((cs, ci) => [`Build cost ${cs > 0 ? '+' : ''}${cs}%`, ...s.profitAed[ci].map((v) => pdfInt(v))]),
      cellColor: (ri, ci) => (ci > 0 ? (s.profitAed[ri][ci - 1] >= 0 ? C.dark : C.red) : undefined),
      boldCell: (ri, ci) => s.costSteps[ri] === 0 && ci > 0 && s.revenueSteps[ci - 1] === 0,
    });
    if (model.breakEvenRevenueFactor != null) {
      const psf = base === 'bts' && ENGINES[lead.engineId].kind === 'psf' && inputs.components.length === 1 ? ` (a sale price of AED ${pdfInt(lead.salesPsfSfa * model.breakEvenRevenueFactor)} per sqft)` : '';
      kit.para(`Break-even: the project makes neither profit nor loss at ${(model.breakEvenRevenueFactor * 100).toFixed(0)}% of the revenue assumed${psf}.`, { size: 8.5 });
    }
    if (model.residualLand) {
      const r = model.residualLand;
      kit.para(
        `Break-even land price: profit is zero at a land cost of ${r.atBreakevenAed != null ? pdfAed(r.atBreakevenAed) : 'no positive value'}. ` +
          `A ${r.targetIrrPct}% IRR needs a land cost of ${r.atTargetIrrAed != null ? pdfAed(r.atTargetIrrAed) : 'less than zero - not reachable on these assumptions'}. ` +
          'These are outputs of this model, not a valuation of the plot.',
        { size: 8.5 },
      );
    }
  }

  // ═══ Departures from the defaults ═══════════════════════════════════
  kit.gap(3);
  kit.sectionTitle('Where this study departs from the defaults');
  const notes = deviationNotes(a, core);
  if (notes.length === 0) {
    kit.para('No input is 15% or more away from its default, so the result above is the default case for this plot and engine.', { size: 8.5 });
  } else {
    kit.para('Each line re-runs the model with one input put back to its default. Largest effect first.', { size: 8, color: C.gray, italic: true });
    for (const n of notes) kit.para(`- ${n}`, { size: 8.5 });
  }

  // ═══ Joint venture ═══════════════════════════════════════════════════
  if (jv) {
    kit.gap(3);
    kit.sectionTitle('Joint venture');
    const typeLabel = jv.type === 'profit_share' ? 'Profit share: land value returned, then a share of profit' : jv.type === 'revenue_share' ? 'Revenue share: landowner takes a share of gross revenue' : 'Equity: shares in proportion to capital contributed';
    kit.para(`${typeLabel}. Both partners sit on the project's own cashflow, so their returns add up to the project's.`, { size: 8.5 });
    kit.table({
      head: ['', 'Landowner', 'Developer', 'Project'],
      widths: [0.34, 0.22, 0.22, 0.22],
      rows: [
        ['Contribution', pdfAed(jv.landowner.contributionAed), pdfAed(jv.developer.contributionAed), pdfAed(jv.project.totalCostAed)],
        ['Receipts', pdfAed(jv.landowner.receiptsAed), pdfAed(jv.developer.receiptsAed), pdfAed(jv.project.netRevenueAed)],
        ['Profit', pdfAed(jv.landowner.profitAed), pdfAed(jv.developer.profitAed), pdfAed(jv.project.profitAed)],
        ['Multiple', `${jv.landowner.multiple.toFixed(2)}x`, `${jv.developer.multiple.toFixed(2)}x`, '-'],
        ['IRR', pdfPct(jv.landowner.irrPct), pdfPct(jv.developer.irrPct), pdfPct(jv.project.irrPct)],
      ],
      boldRows: [2, 4],
    });
    kit.para(
      `Landowner share: ${jv.landownerSharePct.toFixed(1)}%${jv.shareIsDerived ? ' (derived from capital)' : ''}. Developer peak funding: ${pdfAed(jv.developer.peakFundingAed)}.` +
        (jv.entitlementCapped ? ' The project cannot pay the landowner in full; receipts are capped at what it generates.' : ''),
      { size: 8.5 },
    );
    if (!jv.shareIsDerived) {
      kit.subhead('Sell the land today, or contribute it');
      kit.table({
        head: ['Landowner share', 'Receives', 'Against selling today', 'Same, in today\'s money'],
        widths: [0.22, 0.26, 0.26, 0.26],
        rows: jv.sellVsJv.map((r) => [`${r.sharePct}%`, pdfAed(r.landownerReceiptsAed), pdfAed(r.vsSellAed), pdfAed(r.vsSellPvAed)]),
        cellColor: (ri, ci) => (ci >= 2 ? ((ci === 2 ? jv.sellVsJv[ri].vsSellAed : jv.sellVsJv[ri].vsSellPvAed) >= 0 ? C.green : C.red) : undefined),
      });
      kit.para(
        `"Receives" includes the return of the land value. "Against selling today" compares it with a sale at ${pdfAed(jv.landValueAed)} now; the last column discounts the receipts at ${inputs.discountRatePct}% first.` +
          (jv.breakevenSharePct != null ? ` Break-even share in today's money: ${jv.breakevenSharePct.toFixed(1)}%.` : ''),
        { size: 8, color: C.gray },
      );
    }
  }

  // ═══ Not included ════════════════════════════════════════════════════
  kit.gap(3);
  kit.sectionTitle('What is not included');
  for (const n of NOT_INCLUDED) kit.para(`- ${n}`, { size: 8.5 });

  // ═══ Basis of assumptions ════════════════════════════════════════════
  kit.gap(3);
  kit.sectionTitle('Basis of assumptions');
  kit.para('Where each default came from. "Assumed" and "Placeholder" items have no published source and should be replaced with project figures.', { size: 8, color: C.gray, italic: true });
  const STATUS: Record<string, string> = { sourced: 'Sourced', derived: 'Derived', carried: 'Carried (v5)', assumed: 'Assumed', placeholder: 'Placeholder' };
  const seen = new Set<string>();
  for (const c of inputs.components) {
    if (seen.has(c.engineId)) continue;
    seen.add(c.engineId);
    const eng = ENGINES[c.engineId];
    const keys = (Object.keys(eng.prov) as ProvKey[]).filter((k) => eng.prov[k] && eng.prov[k]!.note !== 'Not used by this engine.');
    kit.subhead(`${eng.label}${eng.validated ? '' : ' - research defaults, not validated'}`);
    kit.table({
      head: ['Input', 'Status', 'Basis'],
      widths: [0.2, 0.13, 0.67],
      align: ['left', 'left', 'left'],
      size: 7.5,
      rows: keys.map((k) => [k.replace(/([A-Z])/g, ' $1').toLowerCase(), STATUS[eng.prov[k]!.s], eng.prov[k]!.note]),
      cellColor: (ri, ci) => (ci === 1 ? (eng.prov[keys[ri]]!.s === 'sourced' || eng.prov[keys[ri]]!.s === 'derived' ? C.green : eng.prov[keys[ri]]!.s === 'carried' ? C.gray : C.amber) : undefined),
    });
  }
  kit.subhead('Project-level');
  const pk = Object.keys(PROJECT_PROV) as Array<keyof typeof PROJECT_PROV>;
  kit.table({
    head: ['Input', 'Status', 'Basis'],
    widths: [0.2, 0.13, 0.67],
    align: ['left', 'left', 'left'],
    size: 7.5,
    rows: pk.map((k) => [k.replace(/([A-Z])/g, ' $1').toLowerCase(), STATUS[PROJECT_PROV[k].s], PROJECT_PROV[k].note]),
    cellColor: (ri, ci) => (ci === 1 ? (PROJECT_PROV[pk[ri]].s === 'sourced' || PROJECT_PROV[pk[ri]].s === 'derived' ? C.green : PROJECT_PROV[pk[ri]].s === 'carried' ? C.gray : C.amber) : undefined),
  });

  // ═══ Glossary ════════════════════════════════════════════════════════
  kit.gap(3);
  kit.sectionTitle('Glossary');
  const glossary: Array<[string, string]> = [
    ['GFA', 'Gross Floor Area: the area the plot is entitled to build, from the affection plan (Max GFA) or plot area x FAR. Excludes parking.'],
    ['BUA', 'Built-Up Area: everything that gets built, including parking and basements. Construction is costed on GFA and parking on the difference.'],
    ['SFA', 'Saleable / leasable floor area = GFA x efficiency. Sales and rent are calculated on SFA.'],
    ['Total investment', 'Every cost line above: land, fees, construction, soft costs and finance interest. Selling costs are netted from revenue instead.'],
    ['ROI', 'Net profit / total investment. Not time-weighted.'],
    ['IRR', 'Annualised return on the equity cashflow, month by month. Reflects the design period, build time, sell-out and any debt or escrow.'],
    ['Peak equity', 'The most cash the developer has tied up at any point.'],
    ['NOI', 'Net operating income: revenue less operating costs, per year, once the asset is stabilised.'],
    ['Yield on cost', 'Stabilised NOI / total investment.'],
    ['Cap rate', 'NOI / value. A lower cap rate means a higher value for the same income.'],
    ['Ramp-up', 'The years a new hotel, hospital, school or let building takes to reach stabilised income.'],
    ['Escrow', 'RERA trust account (Law 8/2007). Off-plan buyer payments are held there and released against construction progress; 5% is retained for a year after completion.'],
    ['Verdict', verdictBandsText()],
  ];
  for (const [term, def] of glossary) {
    kit.ensure(9);
    const y0 = kit.y;
    doc.setFontSize(8.5);
    doc.setTextColor(...C.goldDark);
    doc.setFont('helvetica', 'bold');
    doc.text(term, M, y0);
    kit.para(def, { size: 8.5, indent: 30 });
    kit.y = Math.max(kit.y, y0 + 4) + 0.5;
  }

  // ═══ Disclaimer ══════════════════════════════════════════════════════
  kit.gap(5);
  kit.sectionTitle('Disclaimer');
  kit.para(
    'This report is a feasibility estimate, not a formal valuation or appraisal. Its figures come from the assumptions listed above, some of which are market-wide averages or assumptions rather than figures verified for this plot, and none of which have been checked against this project\'s contracts, tenders or RERA-certified construction reports. ' +
      'Investment decisions should be supported by an independent RICS-registered valuer and a quantity surveyor. ZAAHI bears no responsibility for outcomes derived from this estimate.',
    { size: 8.5 },
  );

  kit.finish(`ZAAHI Feasibility - model v${model.modelVersion} - defaults ${model.defaultsVersion} - ${dateStr} - zaahi.io`);
  const engineTag = inputs.components.length > 1 ? 'Mixed' : ENGINES[lead.engineId].label.replace(/[^A-Za-z]+/g, '_');
  const modeTag = inputs.mode === 'bts' ? 'BtS' : inputs.mode === 'btr' ? 'BtR' : 'JV';
  return { kit, fileName: `ZAAHI-Feasibility-${parcel.plotNumber}-${engineTag}-${modeTag}-${dateStr}.pdf` };
}

export function downloadFeasibilityPdf(a: FeasibilityPdfArgs): boolean {
  const built = buildFeasibilityPdf(a);
  if (!built) return false;
  built.kit.doc.save(built.fileName);
  return true;
}
