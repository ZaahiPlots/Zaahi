// Runs the audit test plot (3720111, Jumeirah Central, 144,250 sqft, FAR 2.5,
// test land cost AED 150M) through every engine and mode and prints the table
// that goes in docs/agent-log/2026-11-20-feasibility-v6-accuracy.md.
//
//   npx tsx scripts/feasibility-audit-plot.ts
import { ENGINE_ORDER, ENGINES } from '../src/lib/feasibility-v6/engines';
import { computeFeasibility, defaultInputs, type StudyInputs } from '../src/lib/feasibility-v6/model';

const M = (n: number) => (Number.isFinite(n) ? `${(n / 1e6).toFixed(1)}M` : '—');
const P = (n: number) => (Number.isFinite(n) ? `${n.toFixed(1)}%` : '—');

const rows: string[] = [];
rows.push('| Engine | Mode | Total cost | Net revenue | Profit | ROI | IRR | Yield on cost | Peak equity | Verdict |');
rows.push('|---|---|---|---|---|---|---|---|---|---|');
for (const id of ENGINE_ORDER) {
  for (const mode of ['bts', 'btr', 'jv'] as const) {
    const inp: StudyInputs = {
      ...defaultInputs({ plotAreaSqft: 144_250, far: 2.5, maxGfaSqft: null, landUse: 'RESIDENTIAL', landCostAed: 150_000_000 }, id, true),
      mode,
    };
    if (ENGINES[id].unitsMustBeEntered) inp.components[0].units = Number(process.env.DC_MW ?? 20);
    const m = computeFeasibility(inp, { light: true });
    if (m.status === 'blocked' || !m.core) {
      rows.push(`| ${ENGINES[id].label} | ${mode} | — | — | — | — | — | — | — | ${m.blockers.map((b) => b.title).join('; ')} |`);
      continue;
    }
    const c = m.core;
    rows.push(
      `| ${ENGINES[id].label} | ${mode}${m.jv ? `→${m.jv.baseMode}` : ''} | ${M(c.totalCostAed)} | ${M(c.netRevenueAed)} | ${M(c.profitAed)} | ${P(c.roiPct)} | ${P(c.irrPct)} | ${c.mode === 'btr' || c.stabilisedNoiAed > 0 ? P(c.yieldOnCostPct) : 'n/a'} | ${M(c.peakEquityAed)} | ${m.verdict?.label ?? '—'} |`,
    );
  }
}
console.log(rows.join('\n'));
