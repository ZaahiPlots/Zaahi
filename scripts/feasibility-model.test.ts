// Invariants of the v6.1 feasibility model, one per audit finding.
//
//   npx tsx scripts/feasibility-model.test.ts
//
// Supersedes mixeduse-model / mixeduse-headline / jv-irr / feasibility-land-guard
// tests, whose invariants are re-asserted here against the single model.

import { ENGINE_ORDER, ENGINES, type EngineId } from '../src/lib/feasibility-v6/engines';
import {
  computeFeasibility,
  componentFor,
  defaultInputs,
  projectDefaultsFor,
  type StudyInputs,
  type CoreResult,
} from '../src/lib/feasibility-v6/model';
import { AREA_BENCHMARKS, benchmarkFor, benchmarkPatch } from '../src/lib/feasibility-v6/areaBenchmarks';
import { parseStudyInputs } from '../src/lib/feasibility-v6/study';
import { irr } from '../src/lib/feasibility-v6/irr';
import { routeLandUse, shareToEngine } from '../src/lib/feasibility-v6/routing';
import { adaptParcelToInput, adaptSidePanelToInput } from '../src/lib/feasibility-v6/parcelInput';

let failures = 0;
let checks = 0;
function ok(cond: boolean, name: string, detail = '') {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;

// The audit test plot: 3720111, Jumeirah Central, 144,250 sqft, FAR 2.5, land AED 150M.
const SITE = { plotAreaSqft: 144_250, far: 2.5, maxGfaSqft: null, landUse: 'RESIDENTIAL', landCostAed: 150_000_000 };
function base(engineId: EngineId, patch?: (i: StudyInputs) => void): StudyInputs {
  const inp = defaultInputs(SITE, engineId, true);
  if (ENGINES[engineId].unitsMustBeEntered) inp.components[0].units = 20;
  patch?.(inp);
  return inp;
}

function reconciles(core: CoreResult, tag: string) {
  const costSum = core.costLines.reduce((s, l) => s + l.aed, 0);
  const revSum = core.revenueLines.reduce((s, l) => s + l.aed, 0);
  const cfSum = core.monthly.reduce((s, r) => s + r.netAed, 0);
  ok(near(costSum, core.totalCostAed), `${tag}: cost lines sum to total cost`, `${costSum} vs ${core.totalCostAed}`);
  ok(near(revSum, core.netRevenueAed), `${tag}: revenue lines sum to net revenue`);
  ok(near(core.netRevenueAed - core.totalCostAed, core.profitAed), `${tag}: profit = net revenue − total cost`);
  ok(near(cfSum, core.profitAed, 5), `${tag}: equity cashflow sums to profit`, `${cfSum} vs ${core.profitAed}`);
  const compBuild = core.components.reduce((s, c) => s + c.constructionAed + c.equipmentAed + c.preOpeningAed, 0);
  const lineBuild = core.costLines
    .filter((l) => ['construction', 'parking', 'brand', 'infrastructure', 'consultancy', 'contingency', 'equipment', 'preopening'].includes(l.id))
    .reduce((s, l) => s + l.aed, 0);
  ok(near(compBuild, lineBuild, 5), `${tag}: component build costs equal the construction lines (B8)`);
}

// ── 1. Every engine × mode reconciles, with and without debt / escrow / instalments
const variants: Array<[string, (i: StudyInputs) => void]> = [
  ['plain', () => {}],
  ['debt', (i) => { i.finance = { enabled: true, loanAed: 150_000_000, ratePct: 7 }; }],
  ['debt+instalments', (i) => { i.finance = { enabled: true, loanAed: 150_000_000, ratePct: 7 }; i.land.paymentMode = 'installments'; }],
  ['offplan+debt+instalments', (i) => { i.sales.offPlan = true; i.finance = { enabled: true, loanAed: 100_000_000, ratePct: 7 }; i.land.paymentMode = 'installments'; }],
  ['btr repay-at-handover', (i) => { i.finance = { enabled: true, loanAed: 150_000_000, ratePct: 7 }; i.rental.debtAtHandover = 'repay'; }],
];
for (const id of ENGINE_ORDER) {
  for (const mode of ['bts', 'btr', 'jv'] as const) {
    for (const [vn, patch] of variants) {
      const m = computeFeasibility(base(id, (i) => { i.mode = mode; patch(i); }), { light: true });
      if (m.status === 'blocked') {
        ok(m.core === null && m.verdict === null, `${id}/${mode}/${vn}: a blocked model carries no result and no verdict`);
        continue;
      }
      reconciles(m.core!, `${id}/${mode}/${vn}`);
    }
  }
}

// ── 2. Gates (B1, B5, B6, B10)
{
  const noLand = computeFeasibility(base('residential', (i) => { i.land.costAed = null; }));
  ok(noLand.status === 'blocked' && noLand.blockers.some((b) => b.code === 'LAND_PRICE_UNKNOWN'), 'B1: no land price → blocked');
  ok(noLand.verdict === null && noLand.core === null, 'B1: no land price → no verdict, no numbers');
  ok(computeFeasibility(base('residential', (i) => { i.land.costAed = 0; })).status === 'blocked', 'B1: land price 0 is unknown, not free');

  const noFar = computeFeasibility(base('residential', (i) => { i.site.far = null; }));
  ok(noFar.blockers.some((b) => b.code === 'FAR_UNKNOWN'), 'B6: no FAR and no Max GFA → blocked, never 2.5');
  const gfaOnly = computeFeasibility(base('residential', (i) => { i.site.far = null; i.site.maxGfaSqft = 300_000; }));
  ok(gfaOnly.status === 'ok' && near(gfaOnly.core!.areas.gfaSqft, 300_000), 'B6: Max GFA alone is enough');
  const noArea = computeFeasibility(base('residential', (i) => { i.site.plotAreaSqft = null; }));
  ok(noArea.blockers.some((b) => b.code === 'AREA_UNKNOWN'), 'no plot area → blocked');

  for (const lu of ['UTILITY', 'TRANSPORT', 'TRANSPORTATION', 'OPEN SPACE', 'GOVERNMENT AUTHORITIES', 'PUBLIC FACILITIES', 'PUBLIC FACILITY', 'RECREATIONAL', 'WATER BODY', 'FACILITIES']) {
    ok(!routeLandUse(lu).developable, `B5: ${lu} is not a development plot`);
    const m = computeFeasibility(base('residential', (i) => { i.site.landUse = lu; i.site.engineChosenByUser = false; }));
    ok(m.blockers.some((b) => b.code === 'NOT_DEVELOPABLE') && m.core === null, `B5: ${lu} prints no profit`);
  }
  ok(routeLandUse('FACILITIES: CHILDREN NURSERY / KINDERGARTEN').engineId === 'educational', 'B5: a facilities plot with a nursery is a school');
  ok(routeLandUse('COMMERCIAL: RETAIL FACILITIES').engineId === 'retail', 'B5: "retail facilities" is retail');
  ok(routeLandUse('HOSPITALITY').engineId === 'hospitality' && routeLandUse('HOSPITAL').engineId === 'healthcare', 'hospitality vs hospital');
  ok(routeLandUse('').kind === 'unknown' && routeLandUse('SOMETHING ELSE').kind === 'unknown', 'B5: unknown land use is unknown, not Residential');
  ok(routeLandUse('AGRICULTURAL').kind === 'not_modelled', 'agricultural routes to land-hold (not modelled)');
  const unknownLu = computeFeasibility(base('residential', (i) => { i.site.landUse = ''; i.site.engineChosenByUser = false; }));
  ok(unknownLu.blockers.some((b) => b.code === 'LAND_USE_UNKNOWN'), 'B5: no land use → the user must choose an engine');
  const cou = computeFeasibility(base('residential', (i) => { i.site.landUse = 'UTILITY'; i.site.changeOfUseAck = true; }));
  ok(cou.status === 'ok' && cou.verdict!.label.startsWith('Hypothetical'), 'change-of-use scenario is labelled hypothetical');

  for (const id of ['infrastructure', 'landhold'] as const) {
    for (const mode of ['bts', 'btr', 'jv'] as const) {
      const m = computeFeasibility(base(id, (i) => { i.mode = mode; }));
      ok(m.status === 'blocked' && m.jv === null, `B10: ${id}/${mode} is not modelled — no −100% ROI`);
    }
  }
  const seniorJv = computeFeasibility(base('senior', (i) => { i.mode = 'jv'; }));
  ok(seniorJv.status === 'ok' && seniorJv.jv!.baseMode === 'btr' && seniorJv.jv!.project.roiPct > -100, 'B10: senior JV runs on its rental economics');
  ok(computeFeasibility(base('senior', (i) => { i.mode = 'bts'; })).blockers.some((b) => b.code === 'MODE_UNSUPPORTED'), 'senior has no sale model');
  const dcNoMw = computeFeasibility(base('datacenter', (i) => { i.components[0].units = null; }));
  ok(dcNoMw.blockers.some((b) => b.code === 'UNITS_REQUIRED'), 'data centre needs an entered MW — never inferred from floor area');
}

// ── 3. Defaults that produced wrong answers (B2, B3, B7, M1, M2)
{
  const resBtr = computeFeasibility(base('residential', (i) => { i.mode = 'btr'; })).core!;
  ok(resBtr.yieldOnCostPct > 2 && resBtr.yieldOnCostPct < 10, 'B2: residential BtR yield is single-digit', `${resBtr.yieldOnCostPct}`);
  const dc = computeFeasibility(base('datacenter', (i) => { i.mode = 'btr'; })).core!;
  ok(dc.costLines.find((l) => l.id === 'construction')!.aed >= 20 * 30_000_000, 'B3: data centre capex per MW is applied');
  ok(dc.yieldOnCostPct < 20, 'B3: data centre yield is not 659%');
  for (const id of ['hospitality', 'healthcare', 'educational'] as const) {
    const c = computeFeasibility(base(id)).core!;
    const comp = c.components[0];
    ok(near(comp.units, Math.round(c.areas.gfaSqft / 10.7639 / ENGINES[id].gfaPerUnitSqm), 1), `B7: ${id} unit count comes from GFA, not BUA`);
    ok(c.timeline.endMonth > c.timeline.handoverMonth, `B7: ${id} is sold after ramp-up, not at handover`);
    ok(c.revenueLines.some((l) => l.id === 'assetsalefee') && !c.revenueLines.some((l) => l.id === 'commission'), `B7: ${id} pays an asset-sale fee, not unit-sales commission`);
  }
  ok(computeFeasibility(base('hospitality')).core!.costLines.some((l) => l.id === 'equipment' && l.aed > 0), 'B7: hotel FF&E is a cost line');
  ok(computeFeasibility(base('hospitality')).core!.costLines.some((l) => l.id === 'preopening' && l.aed > 0), 'B7: hotel pre-opening is a cost line');
  const months = new Set(ENGINE_ORDER.filter((e) => ENGINES[e].kind !== 'none').map((e) => ENGINES[e].constructionMonths));
  ok(months.size >= 4, 'M1: build time differs by engine');
  ok(ENGINE_ORDER.filter((e) => ENGINES[e].kind !== 'none').every((e) => ENGINES[e].preConstructionMonths > 0), 'M1: every engine has a design / permit period');
  ok(ENGINES.industrial.buaGfaRatio < 1.2 && ENGINES.industrial.efficiencyPct >= 90, 'M2: industrial area model is a shed, not a tower');
  const longer = computeFeasibility(base('offplan', (i) => { i.programme.constructionMonths += 12; })).core!;
  const shorter = computeFeasibility(base('offplan')).core!;
  ok(longer.irrPct < shorter.irrPct, 'M1: a longer build lowers IRR');
  for (const id of ENGINE_ORDER) {
    const m = computeFeasibility(base(id));
    if (m.core) ok(['authority', 'overhead', 'vat', 'holding'].every((l) => m.core!.costLines.some((x) => x.id === l)), `M9: ${id} shows authority fees, overhead, VAT and holding as lines`);
  }
}

// ── 4. Mixed use (B4, B8, and the 2026-08-27 "mix has no effect" report)
function mixed(shares: Array<[string, string, number]>, patch?: (i: StudyInputs) => void): StudyInputs {
  const inp = defaultInputs(
    {
      ...SITE,
      landUse: 'MIXED USE',
      mix: shares.map(([category, sub, pct]) => ({ category, sub, pct, engineId: shareToEngine({ category, sub, pct }) })),
    },
    'mixeduse',
  );
  patch?.(inp);
  return inp;
}
{
  const chr = computeFeasibility(mixed([['COMMERCIAL', 'RETAIL', 10], ['HOTEL', '', 30], ['RESIDENTIAL', 'APARTMENT', 60]]));
  ok(chr.status === 'ok', 'commercial-hospitality-residential mix computes');
  const hotel = chr.core!.components.find((c) => c.engineId === 'hospitality')!;
  ok(hotel.exitValueAed > 0, 'B4: the hotel slice of a mixed plot earns its sale value');
  reconciles(chr.core!, 'mixed/bts');
  for (const mode of ['btr', 'jv'] as const) {
    const m = computeFeasibility(mixed([['COMMERCIAL', 'RETAIL', 10], ['HOTEL', '', 30], ['RESIDENTIAL', 'APARTMENT', 60]], (i) => { i.mode = mode; }));
    ok(m.status === 'ok', `mixed use is modelled in ${mode}`);
    reconciles(m.core!, `mixed/${mode}`);
  }
  const a = computeFeasibility(mixed([['RESIDENTIAL', '', 30], ['COMMERCIAL', 'OFFICES', 10], ['HOTEL', '', 60]])).core!;
  const b = computeFeasibility(mixed([['RESIDENTIAL', '', 90], ['COMMERCIAL', 'OFFICES', 10], ['HOTEL', '', 0]])).core!;
  ok(!near(a.profitAed, b.profitAed, 1000), 'changing the mix changes the headline');
  const bad = computeFeasibility(mixed([['RESIDENTIAL', '', 90], ['COMMERCIAL', 'OFFICES', 30]]));
  ok(bad.blockers.some((x) => x.code === 'MIX_INVALID') && bad.core === null, 'shares that do not total 100% give no result');
  const util = computeFeasibility(mixed([['RESIDENTIAL', '', 90], ['UTILITY', '', 10]]));
  ok(util.status === 'blocked', 'a non-development slice is not priced as apartments');
}

// ── 5. Area (M10)
{
  const m = computeFeasibility(base('residential', (i) => { i.site.plotAreaSqft = 25_588.8; i.site.far = 2.5; i.site.maxGfaSqft = 64_003.61; }));
  ok(near(m.core!.areas.gfaSqft, 64_003.61, 0.01) && m.core!.areas.gfaSource === 'affection plan Max GFA', 'M10: the plan Max GFA wins over plot × FAR');
}

// ── 6. Finance, escrow (M5, M7)
{
  const plain = computeFeasibility(base('offplan', (i) => { i.sales.offPlan = false; })).core!;
  // Everything is funded before the first sale except the service charge on
  // stock that is still unsold after handover, which the early sales pay for.
  const afterHandover = plain.costLines.find((l) => l.id === 'servicecharge')?.aed ?? 0;
  ok(
    plain.peakEquityAed >= plain.totalCostAed - afterHandover - 1 && plain.peakEquityAed <= plain.totalCostAed + 1,
    'no debt, no escrow: peak equity is the whole pre-sale investment',
  );
  const esc = computeFeasibility(base('offplan')).core!;
  ok(esc.escrow !== null && esc.peakEquityAed < plain.peakEquityAed, 'escrow lowers peak equity');
  ok(esc.escrow!.drawnAed + esc.escrow!.releasedAtHandoverAed + esc.escrow!.retentionAed <= esc.escrow!.receiptsAed + 1, 'escrow cannot pay out more than buyers paid in');
  ok(near(esc.escrow!.retentionAed, esc.escrow!.receiptsAed * 0.05, 1), 'Law 8/2007 Art. 14: 5% retained');
  const escLoan = computeFeasibility(base('offplan', (i) => { i.finance = { enabled: true, loanAed: 100_000_000, ratePct: 7 }; i.land.paymentMode = 'installments'; })).core!;
  ok(escLoan.interestAed > 0 && escLoan.costLines.some((l) => l.id === 'interest'), 'M7: escrow mode keeps the loan');
  ok(escLoan.monthly.slice(1, 25).every((r) => r.costsAed > 0), 'M7: escrow mode keeps the land instalments');
  const jvEsc = computeFeasibility(base('offplan', (i) => { i.mode = 'jv'; i.jv.developmentAgreementFeePct = 4; }));
  ok(jvEsc.core!.escrow !== null, 'M7: the JV reads the same escrow model as Build to Sell');

  const btrRefi = computeFeasibility(base('office', (i) => { i.mode = 'btr'; i.finance = { enabled: true, loanAed: 250_000_000, ratePct: 7 }; })).core!;
  const btrRepay = computeFeasibility(base('office', (i) => { i.mode = 'btr'; i.finance = { enabled: true, loanAed: 250_000_000, ratePct: 7 }; i.rental.debtAtHandover = 'repay'; })).core!;
  ok(btrRefi.peakEquityAed < btrRepay.peakEquityAed, 'M5: refinancing at handover keeps the leverage through the hold');
  const btrExit = computeFeasibility(base('office', (i) => { i.mode = 'btr'; })).core!;
  ok(btrExit.exitCostsAed > 0 && btrExit.revenueLines.some((l) => l.id === 'exitcost'), 'M6: the BtR exit carries selling costs');
  ok(ENGINES.industrial.exitCapRatePct !== ENGINES.residential.exitCapRatePct, 'M6: cap rates differ by engine');
}

// ── 7. JV (B9, M8, and the 2026-08-27 IRR bracket)
{
  for (const type of ['profit_share', 'equity', 'revenue_share'] as const) {
    for (const id of ['offplan', 'residential', 'office', 'hospitality'] as const) {
      const m = computeFeasibility(base(id, (i) => { i.mode = 'jv'; i.jv.type = type; i.components[0].salesPsfSfa *= 1.4; i.components[0].revenuePerUnit *= 1.4; }));
      const jv = m.jv!;
      ok(near(jv.landValueAed, 150_000_000), `B9 ${id}/${type}: the land contribution follows the Land Cost input`);
      // Partners sum to the project, month by month.
      const byMonth = new Map<number, number>();
      for (const e of [...jv.landowner.cashflows, ...jv.developer.cashflows]) byMonth.set(e.month, (byMonth.get(e.month) ?? 0) + e.aed);
      ok(m.core!.monthly.every((r) => near(byMonth.get(r.month) ?? 0, r.netAed, 1)), `${id}/${type}: partner cashflows sum to the project's`);
      const lo = Math.min(jv.landowner.irrPct, jv.developer.irrPct);
      const hi = Math.max(jv.landowner.irrPct, jv.developer.irrPct);
      const p = irr(m.core!.cashflows);
      if ([lo, hi, p].every(Number.isFinite)) ok(p >= lo - 0.01 && p <= hi + 0.01, `${id}/${type}: project IRR is bracketed by its partners`, `${lo} ≤ ${p} ≤ ${hi}`);
      ok(near(jv.landowner.profitAed + jv.developer.profitAed, jv.project.profitAed, 5), `${id}/${type}: partner profits sum to the project profit`);
    }
  }
  const typed = computeFeasibility(base('offplan', (i) => { i.mode = 'jv'; i.land.costAed = 90_000_000; })).jv!;
  ok(near(typed.landValueAed, 90_000_000), 'B9: typing a land cost moves the JV land contribution');
  const ps = computeFeasibility(base('offplan', (i) => { i.mode = 'jv'; i.components[0].salesPsfSfa = 2600; })).jv!;
  ok(ps.landowner.receiptsAed > ps.landValueAed, 'M8: a profitable profit-share JV returns the land value plus a share');
  ok(ps.sellVsJv.every((r) => near(r.vsSellAed, r.landownerReceiptsAed - ps.landValueAed)), 'M8: sell-vs-JV compares total receipts with a sale today');
  const noFee = computeFeasibility(base('offplan', (i) => { i.mode = 'jv'; i.jv.developmentAgreementFeePct = 0; })).core!;
  ok(!noFee.costLines.some((l) => l.id === 'dld'), 'M8: no DLD line when no fee applies');

  // Rent and JV fee, 2026-11-20: title transfer drives the 4% DLD, default off.
  const jvRun = (transfers?: boolean) => computeFeasibility(base('residential', (i) => { i.mode = 'jv'; if (transfers !== undefined) (i.jv as { landTitleTransfers: boolean }).landTitleTransfers = transfers; }));
  const jvOff = jvRun();
  const jvOn = jvRun(true);
  const land = 150_000_000;
  ok(jvOff.core!.costLines.every((l) => l.id !== 'dld'), 'JV fee: default charges no DLD on the land');
  ok(jvOff.jv!.sellVsJv.length > 0 && jvOn.jv!.sellVsJv.length > 0, 'JV fee: sell-vs-JV present');
  const dldLine = jvOn.core!.costLines.find((l) => l.id === 'dld');
  ok(!!dldLine && near(dldLine.aed, land * 0.04, 1), 'JV fee: toggle on charges 4% of the land value', `${dldLine?.aed}`);
  ok(near(jvOn.core!.totalCostAed - jvOff.core!.totalCostAed, land * 0.04, 1), 'JV fee: the project cost differs by exactly the 4% DLD');
  ok(jvOn.jv!.project.profitAed < jvOff.jv!.project.profitAed, 'JV fee: toggle on lowers project profit');
  ok(jvOn.jv!.landowner.profitAed < jvOff.jv!.landowner.profitAed, 'JV fee: toggle on lowers landowner profit (profit share)');
  ok(jvOn.jv!.developer.profitAed < jvOff.jv!.developer.profitAed, 'JV fee: toggle on lowers developer profit');
  ok(jvOn.jv!.sellVsJv.every((r, k) => r.vsSellAed <= jvOff.jv!.sellVsJv[k].vsSellAed), 'JV fee: sell-vs-JV carries the same rule');
  const jvOnZero = computeFeasibility(base('residential', (i) => { i.mode = 'jv'; i.jv.landTitleTransfers = true; i.jv.developmentAgreementFeePct = 0; }));
  ok(jvOnZero.core!.costLines.every((l) => l.id !== 'dld'), 'JV fee: toggle on with a 0% rate charges nothing');
  const legacy = JSON.parse(JSON.stringify(base('residential')));
  delete legacy.jv.landTitleTransfers;
  const parsed = parseStudyInputs(legacy);
  ok(parsed !== null && parsed.jv.landTitleTransfers === false, 'JV fee: a saved study without the toggle reads as off');
}

// ── 7b. Residential rent: city average, no derived area rents (2026-11-20)
{
  ok(ENGINES.residential.rentPsfSfaYear === 77.3, 'rent: residential default is AED 77.3/sqft/yr (Cavendish Maxwell, Sep 2026)');
  ok(ENGINES.offplan.rentPsfSfaYear === 77.3, 'rent: off-plan residential shares the same city average');
  const btr = computeFeasibility(base('residential', (i) => { i.mode = 'btr'; }));
  ok(btr.caveats.some((c) => /City average rent/.test(c) && /77\.3/.test(c)), 'rent: BtR on the default shows the "city average" flag');
  const edited = computeFeasibility(base('residential', (i) => { i.mode = 'btr'; i.components[0].rentPsfSfaYear = 110; }));
  ok(!edited.caveats.some((c) => /City average rent/.test(c)), 'rent: an edited rent drops the "city average" flag');
  ok(edited.core!.stabilisedNoiAed > btr.core!.stabilisedNoiAed, 'rent: the rent stays editable and drives income');
  ok(ENGINES.residential.prov.rentPsfSfaYear.s === 'sourced', 'rent: provenance is sourced, not derived');
  for (const b of AREA_BENCHMARKS) {
    if (b.residentialRentPsfYear != null) ok(!/yield/i.test(b.source), `rent: ${b.name} residential rent is published, not price x yield`);
  }
  const jvc = benchmarkFor({ district: 'JUMEIRAH VILLAGE CIRCLE' });
  const patch = benchmarkPatch('residential', jvc);
  ok(patch.salesPsfSfa === 1408 && patch.rentPsfSfaYear === undefined, 'rent: JVC keeps its published sale price but falls back to the city-average rent');
}

// ── 8. Placeholder inputs withhold the verdict
{
  const retail = computeFeasibility(base('retail'));
  ok(retail.verdict!.tone === 'indicative', 'a placeholder sale price withholds the verdict');
  const retailOwn = computeFeasibility(base('retail', (i) => { i.components[0].salesPsfSfa = 2300; }));
  ok(retailOwn.verdict!.banded, 'entering your own figure restores the verdict');
  const crazy = computeFeasibility(base('residential', (i) => { i.mode = 'btr'; i.components[0].rentPsfSfaYear = 1200; }));
  ok(crazy.verdict!.tone === 'check', 'B2: a 40% yield reads "check inputs", never "Strong"');
}

// ── 9. Parcel adapters never invent a FAR, a price or a land use
{
  const p = adaptParcelToInput(
    { id: 'x', plotNumber: '9229078', district: 'Town Square', emirate: 'Dubai', area: 10_000, currentValuation: null },
    { community: null, projectName: null, masterDeveloper: null, plotAreaSqft: 10_000, far: null, maxGfaSqft: null, maxFloors: null, landUseMix: [{ category: 'UTILITY' }] },
  );
  ok(p.far === null && p.gfaSqft === null, 'B6: adapter leaves FAR null when the plan has none');
  ok(!p.landPriceKnown && p.plotPriceAed === 0, 'B1: adapter marks an unpriced parcel');
  ok(p.landUse === 'UTILITY', 'adapter passes the land use through');
  const q = adaptSidePanelToInput({ id: 'y', plotNumber: '1', district: 'd', emirate: 'Dubai', area: 5000 }, null, null);
  ok(q.landUse === '' && q.far === null, 'B5/B6: no plan → land use and FAR unknown, not Residential / 2.5');
  const r = adaptSidePanelToInput({ id: 'z', plotNumber: '2', district: 'd', emirate: 'Dubai', area: 5000 }, null, 0);
  ok(!r.landPriceKnown, 'a price of 0 is unknown');
}

// ── 10. projectDefaultsFor takes the longest programme of a mix
{
  const d = projectDefaultsFor([componentFor('industrial', 'a', 'A', 50), componentFor('hospitality', 'b', 'B', 50)]);
  ok(d.programme.constructionMonths === ENGINES.hospitality.constructionMonths, 'a mixed programme is as long as its longest use');
}

console.log(`\n${checks} checks, ${failures} failure(s)\n`);
if (failures) process.exit(1);
