// Sold plots layer — Phase B step 1 (docs/specs/sold-plots-layer.md §1–§3, §5, §7, §8).
//
//   npx tsx scripts/build-sold-plots.ts [work-dir]
//
// 1. scripts/sold-plots/extract.py reads the local research stores (Intel kit `deals` only,
//    DXB master db, JVC/JVT/DS/MH master-plan folders, data.dubai dumps) into <work-dir>/*.json.
// 2. This script bridges sales to plots, places them (dda → mp → geo → unplaced), attaches the
//    registered project and writes data/sold-plots/{pins,cards,projects-by-parcel}.json plus
//    docs/research/sold-plots-build-report.md.
// The repo build and the routes read only data/sold-plots/ — nothing here is a runtime dependency.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { classifyProc, dxbArea, fils, median, month, norm, pctl, SQM_TO_SQFT } from './sold-plots/lib';

const ROOT = path.resolve(__dirname, '..');
const WORK = process.argv[2] ?? path.join(os.tmpdir(), 'sold-plots-work');
const OUT = path.join(ROOT, 'data', 'sold-plots');
const COMM_LABEL: Record<string, string> = { jvc: 'JVC', jvt: 'JVT', ds: 'Dubai South', mh: 'Meydan Horizon' };

if (!process.env.SKIP_EXTRACT) execFileSync('python3', ['-I', path.join(__dirname, 'sold-plots', 'extract.py'), WORK], { stdio: 'inherit' });
const load = <T>(n: string): T => JSON.parse(fs.readFileSync(path.join(WORK, `${n}.json`), 'utf8'));

type Reg = { pid: string; area: string; land: string; proj: string | null; type: string; m2: number; master: string; pname: string };
type Proj = { status: string; pct: number | null; cancel: string | null; done: string | null; start: string | null; end: string | null; dev: string | null; escrow: string | null; asof: string };
type Mp = { c: [number, number]; comm: string; mun: string; dld: string; m2: number | null; far: number | null; gfa: number | null; proj: string; land: string; far_src?: string };
type Raw = { s: string; loc?: string; trunc?: number; plot: string; d: string | null; p: number; a: number | null; w: string | null; g: string | number | null };
type Kit = { txn_date: string | null; municipality_number: string; area_name: string; master_project: string; property_type: string; procedure_name: string; amount: number | null; size_sqm: number | null };

const registry = load<Reg[]>('registry');
const projects = load<Record<string, Proj>>('projects');
const dda = load<{ cent: Record<string, [number, number]>; meta: Record<string, [string, number, string]> }>('dda');
const geo = load<{ mp: Record<string, Mp>; harv: Record<string, { c: [number, number]; comm: string; method: string }>; bridge: Record<string, string>; mhpin: Record<string, { pid: string; c: [number, number] }> }>('geo');
const sales = load<Raw[]>('sales');
const kit = load<Kit[]>('kit');
const precision = load<{ jvc_candidates: number; rows: { plot: string; to_edge_m: number; to_centroid_m: number }[] }>('precision');

// ---- bridges -------------------------------------------------------------
const byPid = new Map<string, Reg>();
const byKey = new Map<string, Set<string>>();
for (const r of registry) {
  if (!r.pid) continue;
  byPid.set(String(r.pid), r);
  const k = `${norm(r.area)}|${norm(r.land)}`;
  (byKey.get(k) ?? byKey.set(k, new Set()).get(k)!).add(String(r.pid));
}
const codeToMunc = new Map(Object.entries(geo.bridge).map(([m, c]) => [c, m]));

// projects-by-parcel: parcel_id → registered project id (spec §3.4 item 1), project records stored once.
const parcelProject: Record<string, string> = {};
const usedProjects: Record<string, Proj & { title: string | null }> = {};
for (const r of registry) {
  const p = r.proj != null ? projects[r.proj] : undefined;
  if (r.pid && r.proj != null && p) { parcelProject[r.pid] = r.proj; usedProjects[r.proj] ??= { ...p, title: r.pname || null }; }
}
const projectsByParcel = { asof: Object.values(projects)[0]?.asof ?? '', projects: usedProjects, parcels: parcelProject };

// ---- plot entities -------------------------------------------------------
type Sale = { d: string | null; p: number; a: number | null; w: string | null; g: number | null; src: string; proc?: string };
type Plot = { id: string; pid: string | null; comm: string; area: string; sales: Sale[]; mortgages: number; gifts: number; code: string | null; mpKey: string | null; harvKey: string | null; pinC: [number, number] | null };
const plots = new Map<string, Plot>();
const stats = { dxbRows: 0, dxbNoArea: 0, dxbNoPid: 0, dxbAmbiguous: 0, kitSale: 0, kitMortgage: 0, kitGift: 0, kitOther: 0, dupes: 0 };
const unbridgedByArea = new Map<string, number>();

function plotFor(key: string, init: () => Omit<Plot, 'id' | 'sales' | 'mortgages' | 'gifts'>): Plot {
  let p = plots.get(key);
  if (!p) plots.set(key, (p = { id: key, sales: [], mortgages: 0, gifts: 0, ...init() }));
  return p;
}
const regArea = (pid: string | null) => (pid && byPid.get(pid) ? byPid.get(pid)!.master || byPid.get(pid)!.area : '');

function addPidPlot(pid: string, areaHint: string): Plot {
  const code = geo.bridge[pid] ?? null; // JVC/JVT plot code for this municipality number
  const key = dda.cent[pid] ? pid : code ?? pid;
  return plotFor(key, () => ({ pid, code, comm: '', area: regArea(pid) || areaHint, mpKey: code && geo.mp[code] ? code : geo.mp['MH:' + pid] ? 'MH:' + pid : null, harvKey: code && geo.harv[code] ? code : null, pinC: null }));
}
function addCodePlot(code: string, comm: string): Plot {
  const munc = codeToMunc.get(code) ?? null;
  if (munc && dda.cent[munc]) return addPidPlot(munc, COMM_LABEL[comm]);
  return plotFor(code, () => ({ pid: munc, code, comm: COMM_LABEL[comm], area: COMM_LABEL[comm], mpKey: geo.mp[code] ? code : null, harvKey: geo.harv[code] ? code : null, pinC: null }));
}

for (const s of sales) {
  stats.dxbRows++;
  const sale: Sale = { d: s.d, p: s.p, a: s.a, w: s.w, g: s.g == null || s.g === '' ? null : Number(s.g), src: 'dxb' };
  let plot: Plot | null = null;
  if (s.s === 'jvc' || s.s === 'jvt' || s.s === 'ds') plot = addCodePlot(s.plot, s.s);
  else if (s.s === 'mh') {
    const pin = geo.mhpin[s.plot];
    if (pin) {
      // pins.csv rows without a parcel_id are DXB plots the registry never joined: keep them apart, keyed by DXB plot.
      plot = pin.pid ? addPidPlot(pin.pid, COMM_LABEL.mh) : plotFor(`MH-${s.plot.replace(/[^A-Za-z0-9]+/g, '-')}`, () => ({ pid: null, code: null, comm: COMM_LABEL.mh, area: COMM_LABEL.mh, mpKey: null, harvKey: null, pinC: null }));
      plot.pinC = pin.c; plot.comm = plot.comm || COMM_LABEL.mh;
    }
  } else {
    const area = dxbArea(s.loc ?? '', s.trunc ?? null);
    if (!area) { stats.dxbNoArea++; unbridgedByArea.set('(location truncated)', (unbridgedByArea.get('(location truncated)') ?? 0) + 1); continue; }
    const pids = byKey.get(`${norm(area)}|${norm(s.plot)}`);
    if (!pids) { stats.dxbNoPid++; unbridgedByArea.set(area, (unbridgedByArea.get(area) ?? 0) + 1); continue; }
    if (pids.size > 1) { stats.dxbAmbiguous++; unbridgedByArea.set(area, (unbridgedByArea.get(area) ?? 0) + 1); continue; }
    plot = addPidPlot([...pids][0], area);
  }
  if (!plot) { stats.dxbNoPid++; continue; }
  plot.sales.push(sale);
}
for (const k of kit) {
  const cls = classifyProc(k.procedure_name);
  if (!cls) { stats.kitOther++; continue; }
  const plot = addPidPlot(String(k.municipality_number), k.master_project || k.area_name);
  if (cls === 'mortgage') { plot.mortgages++; stats.kitMortgage++; continue; }
  if (cls === 'gift') { plot.gifts++; stats.kitGift++; continue; }
  stats.kitSale++;
  const a = k.size_sqm ? k.size_sqm * SQM_TO_SQFT : null;
  plot.sales.push({ d: k.txn_date, p: Math.round(k.amount ?? 0), a, w: null, g: null, src: 'kit', proc: k.procedure_name });
}

// ---- dedupe, place, assemble ---------------------------------------------
type Pin = { id: string; lng: number; lat: number; src: 'dda' | 'mp' | 'geo'; approx: boolean; n: number; last: string | null };
const pins: Pin[] = [];
const cards: Record<string, unknown> = {};
const report = new Map<string, { dda: number; mp: number; geo: number; approx: number; unplaced: number; sales: number }>();
const bump = (c: string, f: keyof NonNullable<ReturnType<typeof report.get>>, by = 1) => {
  const r = report.get(c) ?? report.set(c, { dda: 0, mp: 0, geo: 0, approx: 0, unplaced: 0, sales: 0 }).get(c)!;
  r[f] += by;
};
const maxDate = { dxb: '', kit: '' };

for (const plot of plots.values()) {
  // DXB beats the kit for the same (date, price): it carries seller type and capital gain.
  const seen = new Map<string, Sale>();
  for (const s of [...plot.sales].sort((a, b) => (a.src === 'dxb' ? -1 : 1) - (b.src === 'dxb' ? -1 : 1))) {
    const k = `${s.d ?? ''}|${s.p}`;
    if (seen.has(k)) { stats.dupes++; continue; }
    seen.set(k, s);
  }
  const list = [...seen.values()].sort((a, b) => (b.d ?? '').localeCompare(a.d ?? ''));
  if (!list.length) continue; // mortgage/gift-only plots are not "sold"
  for (const s of list) if (s.d && s.d > maxDate[s.src as 'dxb' | 'kit']) maxDate[s.src as 'dxb' | 'kit'] = s.d;

  const mp = plot.mpKey ? geo.mp[plot.mpKey] : null;
  const harv = plot.harvKey ? geo.harv[plot.harvKey] : null;
  const comm = plot.comm || (mp ? COMM_LABEL[mp.comm] : '') || plot.area || '(unknown)';
  let place: { c: [number, number]; src: Pin['src']; approx: boolean } | null = null;
  if (dda.cent[plot.pid ?? plot.id]) place = { c: dda.cent[plot.pid ?? plot.id], src: 'dda', approx: false };
  else if (mp) place = { c: mp.c, src: 'mp', approx: false };
  else if (harv) place = { c: harv.c, src: 'geo', approx: true };
  else if (plot.pinC) place = { c: plot.pinC, src: 'geo', approx: true };
  bump(comm, 'sales', list.length);
  if (!place) { bump(comm, 'unplaced'); continue; }
  bump(comm, place.src);
  if (place.approx) bump(comm, 'approx');

  const pid = plot.pid && byPid.has(plot.pid) ? plot.pid : null;
  const reg = pid ? byPid.get(pid)! : null;
  const proj = reg?.proj != null ? projects[reg.proj] : undefined;
  const meta = dda.meta[plot.pid ?? plot.id];
  const sqft = meta?.[1] ?? list.find((s) => s.a)?.a ?? (mp?.m2 ? mp.m2 * SQM_TO_SQFT : reg?.m2 ? reg.m2 * SQM_TO_SQFT : null);
  pins.push({ id: plot.id, lng: place.c[0], lat: place.c[1], src: place.src, approx: place.approx, n: list.length, last: month(list[0].d) });
  cards[plot.id] = {
    id: plot.id,
    pid: plot.pid,
    comm,
    area: reg?.area ?? plot.area,
    master: meta?.[0] ?? reg?.master ?? mp?.proj ?? null,
    landUse: meta?.[2] ?? reg?.type ?? mp?.land ?? null,
    sqft: sqft ? Math.round(sqft * 100) / 100 : null,
    dldLand: reg?.land ?? mp?.dld ?? null,
    place: { src: place.src, approx: place.approx },
    sales: list.map((s) => ({
      d: s.d,
      p: fils(s.p),
      // derived: price ÷ plot sqft; DXB gives its own plot area per sale, the kit row's own size otherwise
      psf: (s.a ?? sqft) ? fils(s.p / (s.a ?? sqft!)) : null,
      w: s.w,
      g: s.g,
      src: s.src,
      proc: s.proc ?? null,
    })),
    mortgages: plot.mortgages,
    gifts: plot.gifts,
    far: mp?.far ?? null,
    gfaSqft: mp?.gfa ?? null,
    gfaSrc: mp?.far_src ?? (mp?.gfa ? 'master plan' : null),
    project: !pid ? { state: 'unknown' } : proj ? { state: 'project', title: reg!.pname || null, status: proj.status, pct: proj.pct, cancel: proj.cancel, dev: proj.dev, escrow: proj.escrow, start: proj.start, end: proj.end, asof: proj.asof } : { state: 'none' },
  };
}
pins.sort((a, b) => a.id.localeCompare(b.id));

// ---- write ---------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
const asof = {
  dxb: maxDate.dxb,
  kit: maxDate.kit,
  registry: '2026-04-10',
  projects: Object.values(projects)[0]?.asof ?? '',
  built: new Date().toISOString().slice(0, 10),
};
const w = (n: string, v: unknown) => fs.writeFileSync(path.join(OUT, n), JSON.stringify(v));
w('pins.json', { asof, pins });
w('cards.json', { asof, cards });
w('projects-by-parcel.json', projectsByParcel);
const sizes = ['pins.json', 'cards.json', 'projects-by-parcel.json'].map((n) => [n, fs.statSync(path.join(OUT, n)).size] as const);

// ---- report --------------------------------------------------------------
const kb = (n: number) => `${(n / 1048576).toFixed(2)} MB`;
const rows = [...report.entries()].sort((a, b) => b[1].sales - a[1].sales);
const tot = rows.reduce((t, [, r]) => ({ dda: t.dda + r.dda, mp: t.mp + r.mp, geo: t.geo + r.geo, approx: t.approx + r.approx, unplaced: t.unplaced + r.unplaced, sales: t.sales + r.sales }), { dda: 0, mp: 0, geo: 0, approx: 0, unplaced: 0, sales: 0 });
const e = precision.rows.map((r) => r.to_edge_m), c = precision.rows.map((r) => r.to_centroid_m);
const lines = [
  '# Sold plots build report', '',
  `Built ${asof.built} by \`scripts/build-sold-plots.ts\`. Every number is measured by that run.`, '',
  '## Inputs and freshness', '',
  `- DXB sale dates up to **${asof.dxb}**; Intel kit deal dates up to **${asof.kit}**.`,
  `- \`land_registry\` snapshot 2026-04-10 (local dump, ${registry.length} rows). \`projects.json\` snapshot **${asof.projects}**.`,
  '- **D6 refresh of projects.json: failed.** data.dubai / dubaipulse.gov.ae serve a JS portal; the dataset download needs an interactive session (HTTP 200 HTML, no file). The newer `~/Загрузки/projects_2026-05-11…json` is the same 2025-10-02 load (3,039 ids, identical). Built on the 2025-10 snapshot.', '',
  '## Totals', '',
  `- Plots with ≥1 sale: **${tot.dda + tot.mp + tot.geo + tot.unplaced}** — pinned **${pins.length}** (dda ${tot.dda}, mp ${tot.mp}, geo ${tot.geo}; approx ${tot.approx}), unplaced **${tot.unplaced}**.`,
  `- Sales on pinned plots: ${pins.reduce((s, p) => s + p.n, 0)}; sales on unplaced plots: ${rows.reduce((s, [, r]) => s + (r.sales - 0), 0) - pins.reduce((s, p) => s + p.n, 0)}.`,
  `- DXB plot rows read ${stats.dxbRows}: no usable area ${stats.dxbNoArea}, no registry match ${stats.dxbNoPid}, ambiguous (>1 parcel) ${stats.dxbAmbiguous}.`,
  `- Kit land deals with a municipality number: sales ${stats.kitSale}, mortgages ${stats.kitMortgage}, gifts ${stats.kitGift}, other procedures ${stats.kitOther} (not shown). Duplicate (date, price) rows dropped: ${stats.dupes}.`,
  `- Projects-by-parcel entries: ${Object.keys(parcelProject).length}.`, '',
  '## Files', '', ...sizes.map(([n, s]) => `- \`data/sold-plots/${n}\` — ${kb(s)} (${s} bytes)`), '',
  '## Placement by community', '',
  '| community | sales | dda | mp | geo | approx | unplaced plots |', '|---|---:|---:|---:|---:|---:|---:|',
  ...rows.map(([n, r]) => `| ${n} | ${r.sales} | ${r.dda} | ${r.mp} | ${r.geo} | ${r.approx} | ${r.unplaced} |`),
  `| **total** | ${tot.sales} | ${tot.dda} | ${tot.mp} | ${tot.geo} | ${tot.approx} | ${tot.unplaced} |`, '',
  '## DXB rows that never reached a plot (by DLD area, top 25)', '',
  ...[...unbridgedByArea.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([a, n]) => `- ${a}: ${n}`), '',
  '## D5 precision sample — harvested JVC pins vs master-plan polygons', '',
  `Random 50 of ${precision.jvc_candidates} JVC plots that have both a harvested \`gmaps_q\` pin and a master-plan polygon (seed 20261011). Distances in metres, planar EPSG:3997.`, '',
  `- pin → polygon edge (0 = inside): median **${median(e).toFixed(1)} m**, p90 **${pctl(e, 90).toFixed(1)} m**, inside polygon ${e.filter((x) => x === 0).length}/${e.length}`,
  `- pin → polygon centroid: median **${median(c).toFixed(1)} m**, p90 **${pctl(c, 90).toFixed(1)} m**`, '',
  '**Caveat — not independent.** The JVC master-plan polygons were fitted to these same harvested pins (`jvc-masterplan/jvc/align.py` aligns the plan to `coords`), so this measures the fit, not real-world pin accuracy. An independent check needs ground truth we do not hold (assumed: the true error is larger; the 2026 advert-link sample gave median 907 m). Pins are therefore kept `approx`.', '',
];
fs.writeFileSync(path.join(ROOT, 'docs', 'research', 'sold-plots-build-report.md'), lines.join('\n'));
console.log(lines.slice(0, 22).join('\n'));
console.log(rows.slice(0, 15).map(([n, r]) => `${n.padEnd(34)} ${r.sales} d${r.dda} m${r.mp} g${r.geo} u${r.unplaced}`).join('\n'));
