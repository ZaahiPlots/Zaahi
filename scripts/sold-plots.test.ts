// Sold plots layer — build output checks.
//
//   npx tsx scripts/sold-plots.test.ts
//
// 1. 22 known plots whose expected values were derived independently of the build
//    (scripts/sold-plots/known-plots.fixture.json: centroids recomputed with shapely from the
//    DDA / master-plan polygons, dates and prices read straight from the source dbs).
// 2. PII guard: no key matching name|mobile|phone|emirates|email in any file under data/sold-plots/.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { classifyProc, dxbArea, findPiiKeys, median, pctl } from './sold-plots/lib';

const DIR = path.resolve(__dirname, '..', 'data', 'sold-plots');
const read = (n: string) => JSON.parse(fs.readFileSync(path.join(DIR, n), 'utf8'));
const pins = new Map<string, { lng: number; lat: number; src: string; approx: boolean; n: number; last: string | null }>(
  read('pins.json').pins.map((p: { id: string }) => [p.id, p]),
);
const cards = read('cards.json').cards;
let ok = 0;
const check = (name: string, fn: () => void) => { fn(); ok++; console.log('ok', name); };

type Fx = { id: string; src?: string; approx?: boolean; lnglat?: [number, number] | null; last?: string; newest?: string; priceFils?: number; n?: number; absent?: boolean; project?: { status: string; title: string; cancel: string } };
const fixture: Fx[] = JSON.parse(fs.readFileSync(path.join(__dirname, 'sold-plots', 'known-plots.fixture.json'), 'utf8'));
assert.ok(fixture.length >= 20, 'need 20 known plots');

for (const f of fixture) {
  check(`known plot ${f.id}`, () => {
    if (f.absent) { assert.ok(!pins.has(f.id) && !cards[f.id], 'unplaceable plot must not be pinned'); return; }
    const p = pins.get(f.id)!, c = cards[f.id];
    assert.ok(p && c, 'pinned with a card');
    assert.equal(p.src, f.src);
    assert.equal(p.approx, f.approx);
    if (f.lnglat) { assert.ok(Math.abs(p.lng - f.lnglat[0]) < 2e-6 && Math.abs(p.lat - f.lnglat[1]) < 2e-6, `${p.lng},${p.lat} vs ${f.lnglat}`); }
    if (f.last) assert.equal(p.last, f.last);
    if (f.n != null) assert.ok(p.n >= f.n, `n ${p.n} < source ${f.n}`); // the kit can add sales the DXB db lacks
    if (f.newest) { assert.equal(c.sales[0].d, f.newest); assert.equal(c.sales[0].p, f.priceFils); }
    if (f.project) { assert.equal(c.project.status, f.project.status); assert.equal(c.project.title, f.project.title); assert.equal(c.project.cancel, f.project.cancel); }
  });
}

check('pins carry no price', () => {
  for (const p of pins.values()) assert.deepEqual(Object.keys(p).sort(), ['approx', 'id', 'last', 'lat', 'lng', 'n', 'src']);
});
check('pin ids are routable (match /api/sold-plots/[id] pattern)', () => {
  for (const id of pins.keys()) assert.match(id, /^[A-Za-z0-9:_-]{1,40}$/, JSON.stringify(id));
});
check('every pin has a card; prices are integer fils', () => {
  for (const id of pins.keys()) {
    const c = cards[id]; assert.ok(c, id);
    assert.equal(c.sales.length, pins.get(id)!.n);
    for (const s of c.sales) { assert.ok(Number.isInteger(s.p) && s.p > 0, id); if (s.psf != null) assert.ok(Number.isInteger(s.psf), id); }
  }
});
check('lib: procedures and areas', () => {
  assert.equal(classifyProc('Delayed Sell'), 'sale');
  assert.equal(classifyProc('Complete Delayed Sell'), null);
  assert.equal(classifyProc('Modify Mortgage'), 'mortgage');
  assert.equal(classifyProc('Grant'), 'gift');
  assert.equal(dxbArea('Arlington Park II by Majid, Wadi Al Safa 5', 0), 'Wadi Al Safa 5');
  assert.equal(dxbArea('Cove Edition Residence 4 By Imtiaz, Wadi …', 1), null);
  assert.equal(median([1, 2, 3, 10]), 2.5);
  assert.equal(pctl([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90), 9);
});
check('PII guard: detector catches planted keys', () => {
  for (const k of ['name', 'sellerName', 'mobile', 'phone', 'emirates_id', 'email']) assert.ok(findPiiKeys({ a: [{ [k]: 1 }] }).length, k);
  assert.equal(findPiiKeys({ id: 1, p: 2, sales: [{ d: 1, w: 'Developer' }] }).length, 0);
});
check('PII guard: no PII key in data/sold-plots/*', () => {
  for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
    const hits = findPiiKeys(read(f));
    assert.deepEqual(hits.slice(0, 5), [], `${f} carries PII-looking keys`);
  }
});
console.log(`${ok} checks passed`);
