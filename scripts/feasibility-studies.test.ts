// Saved studies + compare — the pure rules, and static guards on the rest.
//
//   npx tsx scripts/feasibility-studies.test.ts
//
// Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md.
//
// What this does NOT cover: the API routes against a database. The migration
// 20261120120000_feasibility_studies is not applied (DATABASE_URL points at
// production), so no route here has ever run a query. Those paths are listed
// as unverified in the spec. The static guards at the bottom read the route
// SOURCE — they prove what the code says, not what the database does.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { defaultInputs, MODEL_VERSION, type StudyInputs } from '../src/lib/feasibility-v6/model';
import type { ParcelInput } from '../src/lib/feasibility-v6/parcelInput';
import {
  COMPARE_METRICS,
  computeOutputs,
  parseStudyInputs,
  plotSnapshot,
  snapshotDefaultsFor,
  type CompareMetric,
  type StudyOutputs,
} from '../src/lib/feasibility-v6/study';
import {
  COMPARE_MAX,
  LIST_LIMIT_DEFAULT,
  LIST_LIMIT_MAX,
  clampListLimit,
  compareHref,
  createStudySchema,
  createVersionSchema,
  defaultStudyName,
  formatMetric,
  parseCompareIds,
  patchStudySchema,
  plotSnapshotSchema,
  resolveStudyAccess,
  shareIsActive,
  shareUnlocksStudies,
  stableStringify,
  stalenessLines,
  stalenessOf,
  toggleCompareSelection,
  versionHeadline,
  type CompareItemDto,
  type ShareLike,
  type StudyAccessSubject,
} from '../src/lib/feasibility-v6/studyRules';
import { buildComparePdf, columnTitle } from '../src/lib/feasibility-v6/comparePdf';
import {
  AutosaveSession,
  backupKeyFor,
  type AutosaveApi,
  type AutosaveStatus,
} from '../src/lib/feasibility-v6/studyAutosave';

let failures = 0;
let checks = 0;
function ok(cond: boolean, name: string, detail = '') {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
function eq<T>(got: T, want: T, name: string) {
  ok(JSON.stringify(got) === JSON.stringify(want), name, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// ── Fixtures ─────────────────────────────────────────────────────────────

const NOW = new Date('2026-11-20T12:00:00.000Z');
const HOUR = 3_600_000;
const OWNER = 'user_owner';
const READER = 'user_reader';
const OTHER = 'user_other';
const ENTRY = 'cmentry0000000000000000001';
const ENTRY_2 = 'cmentry0000000000000000002';
const id = (n: number) => `cmversion00000000000000${String(n).padStart(3, '0')}`;

const study = (patch: Partial<StudyAccessSubject> = {}): StudyAccessSubject => ({ ownerId: OWNER, vaultEntryId: ENTRY, archivedAt: null, ...patch });
const share = (patch: Partial<ShareLike> = {}): ShareLike => ({
  vaultEntryId: ENTRY,
  ownerId: OWNER,
  recipientUserId: READER,
  permission: 'FEASIBILITY',
  revokedAt: null,
  expiresAt: null,
  ...patch,
});

const SITE = { plotAreaSqft: 144_250, far: 2.5, maxGfaSqft: null, landUse: 'RESIDENTIAL', landCostAed: 150_000_000 };
const baseInputs = (patch?: (i: StudyInputs) => void): StudyInputs => {
  const inp = defaultInputs(SITE, 'residential', true);
  patch?.(inp);
  return inp;
};
const PARCEL: ParcelInput = {
  id: 'mock-001',
  plotNumber: '3720111',
  district: 'Jumeirah Central',
  emirate: 'DUBAI',
  community: null,
  projectName: null,
  masterDeveloper: null,
  landUse: 'RESIDENTIAL',
  plotAreaSqft: 144_250,
  far: 2.5,
  maxGfaSqft: null,
  gfaSqft: 360_625,
  plotPriceAed: 150_000_000,
  landPriceKnown: true,
  maxFloors: null,
  landUseMix: [{ category: 'RESIDENTIAL', sub: 'Apartments', areaSqm: 13_401 }],
  notes: null,
};

// ── 1. Who may read a study ──────────────────────────────────────────────

eq(resolveStudyAccess(OWNER, study(), [], NOW), 'owner', 'access: the owner reads their own study');
eq(resolveStudyAccess(OWNER, study({ vaultEntryId: null }), [], NOW), 'owner', 'access: owner, study not attached to a vault entry');
eq(resolveStudyAccess(OWNER, study({ archivedAt: NOW }), [], NOW), 'owner', 'access: owner keeps an archived study');

eq(resolveStudyAccess(READER, study(), [], NOW), 'none', 'access: no share → none');
eq(resolveStudyAccess(READER, study(), [share({ permission: 'VIEW' })], NOW), 'none', 'access: a VIEW share does not unlock studies');
eq(resolveStudyAccess(READER, study(), [share({ permission: 'FEASIBILITY' })], NOW), 'shared', 'access: FEASIBILITY share → shared');
eq(resolveStudyAccess(READER, study(), [share({ permission: 'OFFER' })], NOW), 'shared', 'access: OFFER share → shared');
eq(resolveStudyAccess(READER, study(), [share({ permission: 'feasibility' })], NOW), 'none', 'access: permission match is exact, not case-folded');
eq(resolveStudyAccess(READER, study(), [share({ permission: '' })], NOW), 'none', 'access: empty permission → none');

eq(resolveStudyAccess(READER, study(), [share({ revokedAt: new Date(NOW.getTime() - HOUR) })], NOW), 'none', 'access: revoked share → none');
eq(resolveStudyAccess(READER, study(), [share({ revokedAt: new Date(NOW.getTime() + HOUR) })], NOW), 'none', 'access: any revokedAt, even future-dated, is revoked');
eq(resolveStudyAccess(READER, study(), [share({ expiresAt: new Date(NOW.getTime() - 1) })], NOW), 'none', 'access: expired share → none');
eq(resolveStudyAccess(READER, study(), [share({ expiresAt: NOW })], NOW), 'none', 'access: expiry equal to now has lapsed');
eq(resolveStudyAccess(READER, study(), [share({ expiresAt: new Date(NOW.getTime() + 1) })], NOW), 'shared', 'access: expiry in the future is active');
eq(resolveStudyAccess(READER, study(), [share({ expiresAt: new Date(NOW.getTime() + HOUR).toISOString() })], NOW), 'shared', 'access: ISO-string expiry in the future is active');
eq(resolveStudyAccess(READER, study(), [share({ expiresAt: new Date(NOW.getTime() - HOUR).toISOString() })], NOW), 'none', 'access: ISO-string expiry in the past → none');
eq(resolveStudyAccess(READER, study(), [share({ expiresAt: 'not-a-date' })], NOW), 'none', 'access: an unreadable expiry fails closed');

eq(resolveStudyAccess(READER, study(), [share({ vaultEntryId: ENTRY_2 })], NOW), 'none', 'access: a share on a different entry → none');
eq(resolveStudyAccess(READER, study(), [share({ recipientUserId: OTHER })], NOW), 'none', "access: someone else's share → none");
eq(resolveStudyAccess(READER, study(), [share({ ownerId: OTHER })], NOW), 'none', 'access: a share not granted by the study owner → none');
eq(resolveStudyAccess(READER, study({ vaultEntryId: null }), [share()], NOW), 'none', 'access: a study attached to no entry cannot be shared');
eq(resolveStudyAccess(READER, study({ archivedAt: NOW }), [share()], NOW), 'none', 'access: archiving withdraws a study from readers');
eq(resolveStudyAccess('', study({ ownerId: '' }), [share({ recipientUserId: '' })], NOW), 'none', 'access: an empty caller id is never anyone');
eq(
  resolveStudyAccess(READER, study(), [share({ permission: 'VIEW' }), share({ vaultEntryId: ENTRY_2 }), share({ revokedAt: NOW })], NOW),
  'none',
  'access: several shares, none qualifying → none',
);
eq(resolveStudyAccess(READER, study(), [share({ revokedAt: NOW }), share()], NOW), 'shared', 'access: one qualifying share among several is enough');

ok(shareIsActive({ revokedAt: null, expiresAt: null }, NOW), 'share: never-expiring, not revoked → active');
ok(!shareUnlocksStudies({ permission: 'VIEW', revokedAt: null, expiresAt: null }, NOW), 'share: VIEW never unlocks studies');
ok(shareUnlocksStudies({ permission: 'OFFER', revokedAt: null, expiresAt: null }, NOW), 'share: OFFER unlocks studies');

// ── 2. Compare: 2–5 distinct version ids ─────────────────────────────────

eq(parseCompareIds(null), { ok: false, error: 'too_few' }, 'compare: missing v → too_few');
eq(parseCompareIds(''), { ok: false, error: 'too_few' }, 'compare: empty v → too_few');
eq(parseCompareIds(id(1)), { ok: false, error: 'too_few' }, 'compare: one id → too_few');
eq(parseCompareIds(`${id(1)},${id(2)}`), { ok: true, ids: [id(1), id(2)] }, 'compare: two ids accepted');
eq(parseCompareIds([1, 2, 3, 4, 5].map(id).join(',')), { ok: true, ids: [1, 2, 3, 4, 5].map(id) }, 'compare: five ids accepted');
eq(parseCompareIds([1, 2, 3, 4, 5, 6].map(id).join(',')), { ok: false, error: 'too_many' }, 'compare: six ids → too_many');
eq(parseCompareIds(`${id(1)},${id(1)}`), { ok: false, error: 'too_few' }, 'compare: the same id twice is one study');
eq(parseCompareIds(`${id(3)},${id(1)},${id(3)},${id(2)}`), { ok: true, ids: [id(3), id(1), id(2)] }, 'compare: duplicates collapse, order kept');
eq(parseCompareIds(` ${id(1)} , ${id(2)} ,`), { ok: true, ids: [id(1), id(2)] }, 'compare: whitespace and a trailing comma are tolerated');
eq(parseCompareIds(`${id(1)},../../etc`), { ok: false, error: 'invalid_id' }, 'compare: a non-cuid id is refused');
eq(parseCompareIds(`${id(1)},${id(2)}' OR 1=1`), { ok: false, error: 'invalid_id' }, 'compare: an injection-shaped id is refused');
eq(parseCompareIds(`${id(1)},${id(2).toUpperCase()}`), { ok: false, error: 'invalid_id' }, 'compare: upper-case is not a cuid');
eq(parseCompareIds(Array.from({ length: 500 }, (_, i) => id(i)).join(',')), { ok: false, error: 'too_many' }, 'compare: an oversized list is refused before per-id work');
eq(compareHref([id(1), id(2)]), `/feasibility/compare?v=${id(1)},${id(2)}`, 'compare: href');
ok(parseCompareIds(new URL(`http://x${compareHref([id(1), id(2)])}`).searchParams.get('v')).ok, 'compare: href round-trips through the parser');

let sel: string[] = [];
for (let i = 1; i <= 7; i++) sel = toggleCompareSelection(sel, id(i));
eq(sel.length, COMPARE_MAX, 'compare: a sixth tick is ignored');
eq(toggleCompareSelection(sel, id(2)).includes(id(2)), false, 'compare: ticking again unticks');
eq(toggleCompareSelection(sel, id(9)), sel, 'compare: selection at the cap is unchanged by a new id');

// ── 3. Request bodies ────────────────────────────────────────────────────

const inputs = baseInputs();
const createBody = { parcelId: 'mock-001', vaultEntryId: null, plot: { plotNumber: '3720111', district: 'Jumeirah Central', emirate: 'DUBAI' }, draftInputs: inputs };
ok(createStudySchema.safeParse(createBody).success, 'create: a real StudyInputs + plot identity is accepted');
ok(createStudySchema.safeParse(JSON.parse(JSON.stringify(createBody))).success, 'create: survives a JSON round trip (what the route receives)');
ok(!createStudySchema.safeParse({ ...createBody, plot: undefined }).success, 'create: plot identity is required');
ok(!createStudySchema.safeParse({ ...createBody, plot: { ...createBody.plot, plotNumber: '' } }).success, 'create: empty plot number refused');
ok(!createStudySchema.safeParse({ ...createBody, draftInputs: { ...inputs, mode: 'flip' } }).success, 'create: inputs with an unknown mode refused');
ok(!createStudySchema.safeParse({ ...createBody, draftInputs: null }).success, 'create: draftInputs is required');
ok(!createStudySchema.safeParse({ ...createBody, name: 'x'.repeat(121) }).success, 'create: over-long name refused');
ok(createStudySchema.safeParse({ ...createBody, parcelId: 'mock-001' }).success, 'create: a preview parcel id is not an error (stored null by the route)');

ok(patchStudySchema.safeParse({ name: 'Base case' }).success, 'patch: rename');
ok(patchStudySchema.safeParse({ draftInputs: inputs }).success, 'patch: autosave');
ok(patchStudySchema.safeParse({ archived: true }).success, 'patch: archive');
ok(patchStudySchema.safeParse({ vaultEntryId: null }).success, 'patch: detach');
ok(patchStudySchema.safeParse({ vaultEntryId: ENTRY }).success, 'patch: attach');
ok(!patchStudySchema.safeParse({}).success, 'patch: an empty patch is refused');
ok(!patchStudySchema.safeParse({ latestVersion: 99 }).success, 'patch: latestVersion cannot be written by a client');
ok(!patchStudySchema.safeParse({ name: 'x', ownerId: OTHER }).success, 'patch: ownerId cannot be written by a client');
ok(!patchStudySchema.safeParse({ name: 'x', versions: [] }).success, 'patch: versions cannot be written by a client');
ok(!patchStudySchema.safeParse({ vaultEntryId: '../x' }).success, 'patch: a malformed vault entry id is refused');
ok(!patchStudySchema.safeParse({ name: '   ' }).success, 'patch: a blank name is refused');

const snap = plotSnapshot(PARCEL);
ok(plotSnapshotSchema.safeParse(snap).success, 'version: plotSnapshot(parcel) passes the schema');
const versionBody = { name: 'Base case', notes: 'as marketed', inputs, plotSnapshot: snap };
const parsedVersion = createVersionSchema.safeParse({ ...versionBody, outputs: { irrPct: 999, profitAed: 1e12 }, version: 7, modelVersion: 'evil' });
ok(parsedVersion.success, 'version: body accepted');
ok(parsedVersion.success && !('outputs' in parsedVersion.data), 'version: client-supplied outputs are dropped, not stored');
ok(parsedVersion.success && !('version' in parsedVersion.data), 'version: a client cannot choose the version number');
ok(parsedVersion.success && !('modelVersion' in parsedVersion.data), 'version: a client cannot choose the model version');
ok(!createVersionSchema.safeParse({ ...versionBody, name: '' }).success, 'version: a name is required');
ok(!createVersionSchema.safeParse({ ...versionBody, notes: 'x'.repeat(4001) }).success, 'version: over-long notes refused');
ok(!createVersionSchema.safeParse({ ...versionBody, plotSnapshot: { ...snap, far: Number.POSITIVE_INFINITY } }).success, 'version: a non-finite plot fact is refused');

// ── 4. The stored result is a function of the inputs alone ───────────────

const wire = parseStudyInputs(JSON.parse(JSON.stringify(inputs)));
ok(wire !== null, 'recompute: inputs survive the wire and re-validate');
if (wire) {
  const a = computeOutputs(inputs);
  const b = computeOutputs(wire);
  eq(b, a, 'recompute: server recompute of wire inputs equals the local result');
  eq(a.modelVersion, MODEL_VERSION, 'recompute: outputs carry the model version');
  eq(versionHeadline(a).status, 'ok', 'recompute: a complete study has a result');
  ok(typeof versionHeadline(a).irrPct === 'number', 'recompute: headline carries the IRR');
}
eq(versionHeadline(null).status, 'blocked', 'headline: null outputs → blocked, no throw');
eq(versionHeadline({ status: 'ok', irrPct: 'NaN', roiPct: Number.NaN, verdictLabel: '' }), { status: 'ok', profitAed: null, roiPct: null, irrPct: null, verdictLabel: null, verdictTone: null }, 'headline: junk fields become null');

// ── 5. Autosave helpers ──────────────────────────────────────────────────

eq(stableStringify({ b: 1, a: { d: [3, 2, 1], c: null } }), stableStringify({ a: { c: null, d: [3, 2, 1] }, b: 1 }), 'stable: key order does not matter');
ok(stableStringify({ a: [1, 2] }) !== stableStringify({ a: [2, 1] }), 'stable: array order does matter');
eq(stableStringify({ a: undefined, b: 1 }), stableStringify({ b: 1 }), 'stable: undefined keys are dropped like JSON does');
eq(stableStringify(inputs), stableStringify(JSON.parse(JSON.stringify(inputs))), 'stable: inputs equal their own JSON round trip (no spurious autosave)');
ok(stableStringify(inputs) !== stableStringify(baseInputs((i) => (i.programme.constructionMonths += 1))), 'stable: a one-field change is seen');
eq(defaultStudyName(new Date(2026, 10, 20, 9, 5)), 'Study 20 Nov 2026 09:05', 'name: default study name');
eq(clampListLimit(null), LIST_LIMIT_DEFAULT, 'limit: default');
eq(clampListLimit('100000'), LIST_LIMIT_MAX, 'limit: capped');
eq(clampListLimit('0'), 1, 'limit: floor of 1');
eq(clampListLimit('abc'), LIST_LIMIT_DEFAULT, 'limit: junk → default');

// ── 6. Staleness ─────────────────────────────────────────────────────────

const fresh = { defaultsSnapshot: snapshotDefaultsFor(inputs), plotSnapshot: snap, modelVersion: MODEL_VERSION };
const s0 = stalenessOf(fresh, PARCEL);
ok(!s0.stale && s0.plotChecked, 'stale: a version saved just now against this plot is current');
const s1 = stalenessOf(fresh, { ...PARCEL, plotPriceAed: 175_000_000 });
ok(s1.stale && s1.plot.length === 1 && s1.defaults.length === 0 && !s1.model, 'stale: a price change is flagged as a plot change only');
ok(stalenessLines(s1).some((l) => l.includes('150,000,000') && l.includes('175,000,000')), 'stale: the line names the old and new price');
const s2 = stalenessOf(fresh, { ...PARCEL, far: 3, landUseMix: [{ category: 'COMMERCIAL', sub: 'Office', areaSqm: 13_401 }] });
ok(s2.plot.length >= 2, 'stale: an affection-plan change (FAR + use mix) is flagged');
const s3 = stalenessOf(fresh, null);
ok(!s3.stale && !s3.plotChecked, 'stale: with no parcel to hand the plot is "not checked", not "unchanged"');
const s4 = stalenessOf({ ...fresh, modelVersion: '0.0.1' }, PARCEL);
ok(s4.stale && s4.model, 'stale: an older model version is flagged');
const oldDefaults = JSON.parse(JSON.stringify(fresh.defaultsSnapshot)) as typeof fresh.defaultsSnapshot;
oldDefaults.version = 'old';
const engineKey = Object.keys(oldDefaults.engines)[0];
const fieldKey = Object.keys(oldDefaults.engines[engineKey]).find((k) => typeof (oldDefaults.engines[engineKey] as Record<string, unknown>)[k] === 'number');
if (fieldKey) (oldDefaults.engines[engineKey] as unknown as Record<string, number>)[fieldKey] += 123;
const s5 = stalenessOf({ ...fresh, defaultsSnapshot: oldDefaults }, PARCEL);
ok(!!fieldKey && s5.stale && s5.defaults.length === 1, 'stale: one moved engine default is flagged, once');

// ── 7. Formatting a compared metric ──────────────────────────────────────

const out = computeOutputs(inputs);
const metric = (key: keyof StudyOutputs): CompareMetric => COMPARE_METRICS.find((m) => m.key === key) as CompareMetric;
eq(formatMetric(metric('mode'), out), 'Build to sell', 'format: mode is spelled out');
eq(formatMetric(metric('landCostAed'), out), 'AED 150,000,000', 'format: AED with separators');
ok(/^−?[\d,]+\.\d%$/.test(formatMetric(metric('roiPct'), out)), 'format: percent to one decimal', formatMetric(metric('roiPct'), out));
eq(formatMetric(metric('roiPct'), { ...out, roiPct: -9.46 }), '−9.5%', 'format: a negative percent uses a real minus sign');
eq(formatMetric(metric('roiPct'), { ...out, roiPct: -0.04 }), '0.0%', 'format: a value that rounds to zero carries no sign');
eq(formatMetric(metric('profitAed'), { ...out, profitAed: -0.2 }), 'AED 0', 'format: no "−AED 0"');
eq(formatMetric(metric('profitAed'), { ...out, profitAed: -1_234_567.8 }), '−AED 1,234,568', 'format: a loss carries a minus sign');
eq(formatMetric(metric('irrPct'), { ...out, irrPct: null }), '—', 'format: a missing value is a dash, never 0');
eq(formatMetric(metric('equityMultiple'), { ...out, equityMultiple: 1.8549 }), '1.85×', 'format: multiple');
eq(formatMetric(metric('constructionMonths'), { ...out, constructionMonths: 30 }), '30', 'format: months');

// ── 8. The comparison PDF builds ─────────────────────────────────────────

const item = (n: number, patch?: (i: StudyInputs) => void): CompareItemDto => {
  const inp = baseInputs(patch);
  const o = computeOutputs(inp);
  return {
    access: 'owner',
    study: { id: `cmstudy000000000000000000${n}`, name: `Study ${n}`, plotNumber: '3720111', district: 'Jumeirah Central', emirate: 'DUBAI', parcelId: null, vaultEntryId: null },
    version: {
      id: id(n),
      studyId: `cmstudy000000000000000000${n}`,
      version: n,
      name: `Case ${n} — “quoted” · ≥ 20%`,
      mode: inp.mode,
      engines: o.engines,
      modelVersion: o.modelVersion,
      defaultsVersion: o.defaultsVersion,
      createdAt: NOW.toISOString(),
      headline: versionHeadline(o),
      notes: null,
      inputs: inp,
      outputs: o,
      defaultsSnapshot: snapshotDefaultsFor(inp),
      plotSnapshot: snap,
    },
  };
};
for (const n of [2, 5]) {
  const items = Array.from({ length: n }, (_, i) => item(i + 1, (inp) => (inp.components[0].salesPsfSfa += i * 150)));
  const staleness = items.map((it, i) => stalenessOf(it.version, i === 0 ? { ...PARCEL, plotPriceAed: 1 } : PARCEL));
  let built: ReturnType<typeof buildComparePdf> | null = null;
  try {
    built = buildComparePdf({ items, staleness, now: NOW });
  } catch (e) {
    ok(false, `pdf: ${n} studies build without throwing`, e instanceof Error ? e.message : String(e));
  }
  if (built) {
    const doc = built.kit.doc;
    const size = doc.internal.pageSize;
    ok(size.getWidth() > size.getHeight(), `pdf: ${n} studies → landscape`);
    ok(doc.getNumberOfPages() >= 1 && doc.getNumberOfPages() <= 6, `pdf: ${n} studies → one document of a sane length`, `${doc.getNumberOfPages()} pages`);
    ok(/^ZAAHI-Feasibility-Compare-3720111-2026-11-20\.pdf$/.test(built.fileName), `pdf: ${n} studies → file name`, built.fileName);
    const bytes = doc.output('arraybuffer').byteLength;
    ok(bytes > 3000, `pdf: ${n} studies → non-trivial output`, `${bytes} bytes`);
    const text = Buffer.from(doc.output('arraybuffer')).toString('latin1');
    ok(/Sale price[^\n]*differs/.test(text), `pdf: ${n} studies → the differing assumption row is marked in text`);
    ok(text.includes(' *'), `pdf: ${n} studies → the best cell is marked in text`);
  }
}
eq(columnTitle(item(3), 2).startsWith('C · '), true, 'pdf: columns are lettered');

// ── 9. Static guards on code this script cannot run ──────────────────────

const ROOT = join(__dirname, '..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
const src = walk(join(ROOT, 'src')).map((p) => ({ p: p.slice(ROOT.length + 1), text: readFileSync(p, 'utf8') }));
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Versions are immutable: one INSERT in the whole codebase, nothing else.
const versionWrites = src.flatMap(({ p, text }) =>
  [...strip(text).matchAll(/feasibilityStudyVersion\s*\.\s*(create|createMany|update|updateMany|upsert|delete|deleteMany)\b/g)].map((m) => `${p}:${m[1]}`),
);
eq(versionWrites, ['src/app/api/me/feasibility-studies/[id]/versions/route.ts:create'], 'immutable: the only write to a version row is one create');
const studyDeletes = src.flatMap(({ p, text }) => [...strip(text).matchAll(/feasibilityStudy\s*\.\s*(delete|deleteMany)\b/g)].map((m) => `${p}:${m[1]}`));
eq(studyDeletes, [], 'immutable: no code deletes a study (which would cascade to its versions)');
ok(!src.some(({ text }) => /\$(executeRaw|queryRaw)[\s\S]{0,200}FeasibilityStudy/.test(strip(text))), 'immutable: no raw SQL touches the study tables');

const routes = src.filter(({ p }) => p.startsWith('src/app/api/me/feasibility-studies/') && p.endsWith('route.ts'));
eq(routes.length, 4, 'routes: four route files');
for (const { p, text } of routes) {
  const code = strip(text);
  const handlers = [...code.matchAll(/export async function (GET|POST|PATCH|PUT|DELETE)\b/g)].map((m) => m[1]);
  const gates = [...code.matchAll(/await getApprovedUserId\(req\)/g)].length;
  ok(handlers.length > 0 && gates === handlers.length, `routes: every handler in ${p} is gated by getApprovedUserId`, `${handlers.length} handlers, ${gates} gates`);
  ok(!handlers.includes('DELETE') && !handlers.includes('PUT'), `routes: ${p} has no DELETE / PUT`);
  ok(/export const runtime = 'nodejs'/.test(code), `routes: ${p} runs on nodejs`);
  ok(!/getSessionUserId/.test(code), `routes: ${p} never uses the unapproved-session helper`);
  ok(!/console\.(log|info|debug|warn|error)/.test(code), `routes: ${p} logs nothing itself (failures go through studiesFailure)`);
}
const versionsRoute = routes.find(({ p }) => p.endsWith('[id]/versions/route.ts'));
ok(!!versionsRoute && /computeOutputs\(inputs\)/.test(versionsRoute.text) && !/body\.outputs/.test(versionsRoute.text), 'routes: the versions route recomputes outputs and never reads client outputs');
eq([...strip(versionsRoute?.text ?? '').matchAll(/export async function (\w+)/g)].map((m) => m[1]), ['POST'], 'routes: the versions route is POST only');

// The migration is additive: it creates and constrains only its own tables.
const migration = readFileSync(join(ROOT, 'prisma/migrations/20261120120000_feasibility_studies/migration.sql'), 'utf8').replace(/--.*$/gm, '');
const OWN = ['FeasibilityStudy', 'FeasibilityStudyVersion'];
eq([...migration.matchAll(/CREATE TABLE "(\w+)"/g)].map((m) => m[1]), OWN, 'migration: creates exactly the two study tables');
ok([...migration.matchAll(/ALTER TABLE "(\w+)"/g)].every((m) => OWN.includes(m[1])), 'migration: alters no existing table');
ok([...migration.matchAll(/CREATE (?:UNIQUE )?INDEX "\w+"\s+ON "(\w+)"/g)].every((m) => OWN.includes(m[1])), 'migration: indexes only its own tables');
ok(!/\b(DROP|TRUNCATE|DELETE FROM|UPDATE\s+")/i.test(migration), 'migration: nothing destructive');
ok(/"FeasibilityStudyVersion_studyId_version_key"/.test(migration), 'migration: the version-number race guard is present');
eq([...migration.matchAll(/ALTER TABLE "(\w+)" ENABLE ROW LEVEL SECURITY/g)].map((m) => m[1]), OWN, 'migration: RLS enabled on both tables');

// ── 10. The autosave engine, against a fake server ───────────────────────

type CreateBody = Parameters<AutosaveApi['create']>[0];
interface Call {
  kind: 'create' | 'patch';
  studyId?: string;
  body?: CreateBody;
  inputs: StudyInputs;
}

/** A fake server, a fake clock and a fake localStorage around one session. */
function rig(opts: { parcel?: ParcelInput; vaultEntryId?: string | null; born?: StudyInputs; store?: Map<string, StudyInputs> } = {}) {
  const calls: Call[] = [];
  const statuses: AutosaveStatus['kind'][] = [];
  const created: Array<{ id: string; active: boolean }> = [];
  const store = opts.store ?? new Map<string, StudyInputs>();
  let lost = 0;
  let backupCleared = 0;
  let nextId = 1;
  // What the next API call answers. 'hold' parks it until release() is called.
  let mode: 'ok' | 'hold' | { status: number; code: string } = 'ok';
  const held: Array<() => void> = [];
  let timer: { fn: () => void; ms: number } | null = null;
  let timersSet = 0;

  const answer = async <T,>(okValue: () => T): Promise<{ ok: true; data: T } | { ok: false; status: number; code: string }> => {
    const m = mode;
    if (m === 'hold') await new Promise<void>((res) => held.push(res));
    else if (m !== 'ok') return { ok: false, ...m };
    return { ok: true, data: okValue() };
  };
  const summary = (sid: string, b: CreateBody) =>
    ({
      id: sid,
      name: b.name,
      plotNumber: b.plot.plotNumber,
      district: b.plot.district,
      emirate: b.plot.emirate,
      parcelId: b.parcelId,
      vaultEntryId: b.vaultEntryId,
      latestVersion: 0,
      hasDraft: true,
      draftUpdatedAt: NOW.toISOString(),
      archivedAt: null,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      access: 'owner' as const,
      latest: null,
      recentVersions: [],
    });
  const api: AutosaveApi = {
    create: (body) => {
      calls.push({ kind: 'create', body, inputs: body.draftInputs });
      return answer(() => ({ study: summary(`cmstudy${String(nextId++).padStart(19, '0')}`, body) }));
    },
    patchDraft: (studyId, draftInputs) => {
      calls.push({ kind: 'patch', studyId, inputs: draftInputs });
      return answer(() => ({ study: { draftUpdatedAt: NOW.toISOString(), updatedAt: NOW.toISOString() } }));
    },
  };
  const sess = new AutosaveSession({
    parcel: opts.parcel ?? PARCEL,
    vaultEntryId: opts.vaultEntryId ?? null,
    born: opts.born ?? baseInputs(),
    api,
    backup: { write: (k, i) => void store.set(k, i), clear: (k) => void store.delete(k) },
    events: {
      onStatus: (st) => void statuses.push(st.kind),
      onCreated: (st, active) => void created.push({ id: st.id, active }),
      onDraftSaved: () => undefined,
      onStudyLost: () => void (lost += 1),
      onBackupCleared: () => void (backupCleared += 1),
    },
    now: () => NOW,
    setTimer: (fn, ms) => {
      timersSet += 1;
      timer = { fn, ms };
      return timer;
    },
    clearTimer: (h) => {
      if (timer === h) timer = null;
    },
  });
  return {
    sess,
    calls,
    statuses,
    created,
    store,
    lost: () => lost,
    backupCleared: () => backupCleared,
    timersSet: () => timersSet,
    timerMs: () => (timer as { ms: number } | null)?.ms ?? null,
    hasTimer: () => timer !== null,
    /** The debounce elapses. */
    tick: async () => {
      const t = timer as { fn: () => void } | null;
      timer = null;
      t?.fn();
      await sess.flush();
    },
    setMode: (m: typeof mode) => void (mode = m),
    release: () => {
      const r = held.shift();
      r?.();
    },
    heldCount: () => held.length,
  };
}
const settle = () => new Promise<void>((res) => setTimeout(res, 0));
const variant = (n: number) => baseInputs((i) => (i.programme.constructionMonths = 20 + n));
const KEY = backupKeyFor(PARCEL);

async function autosaveTests() {
  // Opening the calculator creates nothing.
  {
    const r = rig();
    eq(r.sess.change(baseInputs()), false, 'autosave: the inputs the calculator opened with are not a change');
    eq(r.hasTimer(), false, 'autosave: no timer is armed by opening');
    await r.sess.flush();
    eq(r.calls.length, 0, 'autosave: opening the calculator never calls the API');
    eq(r.sess.studyId, null, 'autosave: no study exists before the first change');
  }

  // First change → one create, after the debounce, carrying the plot.
  {
    const r = rig({ vaultEntryId: ENTRY });
    eq(r.sess.change(variant(1)), true, 'autosave: a real change is accepted');
    eq(r.timerMs(), 1500, 'autosave: the debounce is 1.5 s');
    eq(r.calls.length, 0, 'autosave: nothing is sent before the debounce elapses');
    eq(r.statuses, ['pending'], 'autosave: status is "pending" while waiting');
    await r.tick();
    eq(r.calls.map((c) => c.kind), ['create'], 'autosave: the first change lazily creates the study');
    const b = r.calls[0].body as CreateBody;
    eq([b.plot.plotNumber, b.plot.district, b.plot.emirate, b.parcelId, b.vaultEntryId], ['3720111', 'Jumeirah Central', 'DUBAI', 'mock-001', ENTRY], 'autosave: create carries plot identity, parcel id and vault entry id');
    eq(stableStringify(b.draftInputs), stableStringify(variant(1)), 'autosave: create carries the changed inputs');
    eq(r.statuses, ['pending', 'saving', 'saved'], 'autosave: pending → saving → saved');
    ok(r.sess.studyId !== null, 'autosave: the session now has a study');
    eq(r.created.length === 1 && r.created[0].active, true, 'autosave: the created study is reported once, as the active one');

    // Later changes PATCH the same study.
    r.sess.change(variant(2));
    await r.tick();
    eq(r.calls.map((c) => c.kind), ['create', 'patch'], 'autosave: the next change patches, it does not create again');
    eq(r.calls[1].studyId, r.sess.studyId, 'autosave: the patch goes to the study that was created');
    eq(r.sess.change(variant(2)), false, 'autosave: unchanged inputs after a save are not re-sent');
    eq(r.sess.isSaved(variant(2)), true, 'autosave: isSaved reflects the last save');
  }

  // A burst of typing is one save.
  {
    const r = rig();
    for (let i = 1; i <= 6; i++) r.sess.change(variant(i));
    eq(r.timersSet(), 6, 'autosave: each keystroke re-arms the debounce');
    await r.tick();
    eq(r.calls.length, 1, 'autosave: six rapid changes become one request');
    eq(stableStringify(r.calls[0].inputs), stableStringify(variant(6)), 'autosave: …carrying the last state');
  }

  // Typing while the create is in flight must not create a second study.
  {
    const r = rig();
    r.setMode('hold');
    r.sess.change(variant(1));
    const first = r.tick();
    await settle();
    eq(r.calls.map((c) => c.kind), ['create'], 'autosave: create is in flight');
    r.sess.change(variant(2));
    const second = r.sess.flush();
    await settle();
    eq(r.calls.length, 1, 'autosave: the second save waits for the first — no parallel create');
    r.setMode('ok');
    r.release();
    await first;
    await second;
    eq(r.calls.map((c) => c.kind), ['create', 'patch'], 'autosave: one create, then a patch — never two creates');
    eq(r.created.length, 1, 'autosave: exactly one study row');
  }

  // A failed save loses nothing and is retried.
  {
    const r = rig();
    r.setMode({ status: 500, code: 'internal_error' });
    r.sess.change(variant(1));
    await r.tick();
    eq(r.statuses.at(-1), 'error', 'autosave: a 500 shows as an error');
    eq(stableStringify(r.store.get(KEY)), stableStringify(variant(1)), 'autosave: the unsaved inputs are in the browser backup');
    eq(r.sess.studyId, null, 'autosave: no study id is invented on failure');
    r.setMode('ok');
    await r.sess.push(variant(1));
    eq(r.calls.map((c) => c.kind), ['create', 'create'], 'autosave: Retry sends the same inputs again');
    eq(r.statuses.at(-1), 'saved', 'autosave: …and succeeds');
    eq(r.store.has(KEY), false, 'autosave: its own backup is cleared once the save lands');
    eq(r.backupCleared(), 1, 'autosave: the UI is told the backup is gone');
  }
  {
    const r = rig();
    r.setMode({ status: 0, code: 'network' });
    r.sess.change(variant(1));
    await r.tick();
    r.setMode('ok');
    r.sess.change(variant(2));
    await r.tick();
    eq(r.calls.map((c) => c.kind), ['create', 'create'], 'autosave: after an offline failure the next change tries again');
    eq(stableStringify(r.calls[1].inputs), stableStringify(variant(2)), 'autosave: …with the newer inputs');
  }
  {
    const r = rig();
    r.setMode({ status: 400, code: 'validation_failed' });
    r.sess.change(variant(1));
    await r.tick();
    eq(r.statuses.at(-1), 'error', 'autosave: a rejected draft is an error, not a crash');
    ok(r.store.has(KEY), 'autosave: a rejected draft is still kept in the browser');
  }

  // A backup left by an earlier visit is not cleared behind the user's back.
  {
    const earlier = new Map<string, StudyInputs>([[KEY, variant(9)]]);
    const r = rig({ store: earlier });
    r.sess.change(variant(1));
    await r.tick();
    eq(r.statuses.at(-1), 'saved', 'autosave: (earlier-backup case) the new work saves');
    eq(stableStringify(r.store.get(KEY)), stableStringify(variant(9)), "autosave: an earlier visit's unsaved calculation is still there");
    eq(r.backupCleared(), 0, 'autosave: …and the restore prompt is not dismissed');
  }

  // Tables not deployed: one notice, then silence — and the backup stays current.
  {
    const r = rig();
    r.setMode({ status: 503, code: 'studies_unavailable' });
    r.sess.change(variant(1));
    await r.tick();
    eq(r.statuses.at(-1), 'unavailable', 'autosave: 503 studies_unavailable → "unavailable"');
    eq(r.sess.unavailable, true, 'autosave: the session remembers the API is not there');
    const before = r.calls.length;
    r.sess.change(variant(2));
    await r.tick();
    r.sess.change(variant(3));
    await r.tick();
    eq(r.calls.length, before, 'autosave: no further requests once unavailable');
    eq(stableStringify(r.store.get(KEY)), stableStringify(variant(3)), 'autosave: the browser backup keeps up with the latest inputs');
    eq(r.statuses.filter((x) => x === 'unavailable').length, 1, 'autosave: the notice is raised once, not on every keystroke');
    ok(!r.statuses.slice(r.statuses.indexOf('unavailable')).includes('pending'), 'autosave: no "saving…" theatre while unavailable');
  }

  // Typed, then put back before it was sent: nothing is written.
  {
    const r = rig();
    r.sess.change(variant(1));
    r.sess.change(baseInputs());
    eq(r.hasTimer(), false, 'autosave: reverting to the opening inputs cancels the queued save');
    await r.sess.flush();
    eq(r.calls.length, 0, 'autosave: …so no study is created for a change that was undone');
  }
  {
    const r = rig();
    r.sess.change(variant(1));
    await r.tick();
    r.sess.change(variant(2));
    r.sess.change(variant(1));
    await r.sess.flush();
    eq(r.calls.length, 1, 'autosave: reverting to the saved state cancels the queued patch');
    eq(r.statuses.at(-1), 'idle', 'autosave: …and the status stops saying "unsaved"');
  }

  // Put back WHILE the save was in flight: the draft must still end equal to the screen.
  {
    const r = rig();
    r.sess.change(variant(1));
    await r.tick();
    r.setMode('hold');
    r.sess.change(variant(2));
    const inFlight = r.tick();
    await settle();
    r.sess.change(variant(1)); // looks "already saved" right now
    r.setMode('ok');
    r.release();
    await inFlight;
    await r.sess.flush();
    eq(r.calls.map((c) => c.kind), ['create', 'patch', 'patch'], 'autosave: a follow-up patch is sent after the in-flight one');
    eq(stableStringify(r.calls.at(-1)?.inputs), stableStringify(variant(1)), 'autosave: …so the draft ends equal to what is on screen');
  }

  // Opening a study adopts it; edits then go to THAT study.
  {
    const r = rig();
    const S1 = 'cmstudyadopted000000000001';
    r.sess.adopt(S1, variant(5));
    eq(r.sess.change(variant(5)), false, 'autosave: a study just opened is not re-saved');
    r.sess.change(variant(6));
    await r.tick();
    eq(r.calls.length === 1 && r.calls[0].kind === 'patch' && r.calls[0].studyId === S1, true, 'autosave: edits after opening patch the opened study');
  }
  // …unless it is someone else's (shared): edits start the reader's own study.
  {
    const r = rig();
    r.sess.adopt(null, variant(5));
    eq(r.sess.change(variant(5)), false, 'autosave: opening a shared version creates nothing');
    await r.sess.flush();
    eq(r.calls.length, 0, 'autosave: …still nothing');
    r.sess.change(variant(6));
    await r.tick();
    eq(r.calls.map((c) => c.kind), ['create'], "autosave: editing a shared version creates the reader's own study");
  }

  // A save queued for study A can never land in study B, opened after it.
  {
    const r = rig();
    const A = 'cmstudyaaaaaaaaaaaaaaaaaa1';
    const B = 'cmstudybbbbbbbbbbbbbbbbbb1';
    r.sess.adopt(A, variant(1));
    r.setMode('hold');
    r.sess.change(variant(2));
    const one = r.tick(); // in flight → A
    await settle();
    r.sess.change(variant(3));
    const two = r.sess.flush(); // queued behind it, for A
    r.sess.adopt(B, variant(7)); // the user opens B meanwhile
    r.setMode('ok');
    r.release();
    await one;
    await two;
    eq(r.calls.map((c) => `${c.kind}:${c.studyId}`), [`patch:${A}`, `patch:${A}`], 'autosave: both saves went to the study they were queued for');
    eq(r.sess.studyId, B, 'autosave: the session is on the study opened last');
    eq(r.sess.isSaved(variant(7)), true, "autosave: B's baseline is what was loaded, untouched by A's saves");
    eq(r.sess.change(variant(7)), false, 'autosave: B is not overwritten by merely being opened');
  }

  // The study disappeared (404): say so, and start a new one next time.
  {
    const r = rig();
    r.sess.adopt('cmstudygone00000000000001', variant(1));
    r.setMode({ status: 404, code: 'not_found' });
    r.sess.change(variant(2));
    await r.tick();
    eq(r.lost(), 1, 'autosave: a 404 reports the study as lost');
    eq(r.sess.studyId, null, 'autosave: …and forgets its id');
    ok(r.store.has(KEY), 'autosave: …keeping the inputs in the browser');
    r.setMode('ok');
    await r.sess.push(variant(2));
    eq(r.calls.map((c) => c.kind), ['patch', 'create'], 'autosave: Retry then creates a fresh study');
  }

  // push(): "make sure a study exists" for Save version, without duplicates.
  {
    const r = rig();
    await r.sess.push(baseInputs());
    eq(r.calls.map((c) => c.kind), ['create'], 'autosave: Save version on an untouched calculator still creates the study');
    await r.sess.push(baseInputs());
    eq(r.calls.length, 1, 'autosave: pushing what is already saved sends nothing');
    r.sess.markSaved(variant(4));
    eq(r.sess.change(variant(4)), false, 'autosave: inputs frozen as a version are not re-sent as a draft');
  }

  // pristine(): a re-seed with no user change is never saved.
  {
    const r = rig();
    r.sess.pristine(variant(8)); // the calculator re-seeded (e.g. plot price changed)
    eq(r.sess.change(variant(8)), false, 'autosave: a re-seeded, untouched calculator is not a change');
    eq(r.sess.change(baseInputs()), true, 'autosave: …and the old seed no longer counts as untouched');
  }

  // Leaving the plot: what is waiting is sent — to the plot it belongs to.
  {
    const a = rig();
    a.sess.change(variant(1));
    const done = a.sess.dispose(); // plot switched before the debounce elapsed
    const other: ParcelInput = { ...PARCEL, id: 'mock-002', plotNumber: '9999999', district: 'Elsewhere' };
    const b = rig({ parcel: other });
    await done;
    eq(a.calls.length, 1, 'autosave: dispose sends the pending draft immediately');
    eq((a.calls[0].body as CreateBody).plot.plotNumber, '3720111', 'autosave: …for the plot it was typed on');
    eq(a.statuses, ['pending'], 'autosave: a disposed session no longer drives the status line');
    eq(a.created.length, 0, 'autosave: …nor any other UI callback');
    eq(b.calls.length, 0, 'autosave: the next plot starts clean');
    eq(backupKeyFor(other) !== KEY, true, 'autosave: backups are per plot');
  }
}

autosaveTests()
  .catch((e) => ok(false, 'autosave: suite ran to completion', e instanceof Error ? e.message : String(e)))
  .then(() => {
    console.log(`\n${checks - failures}/${checks} checks passed`);
    if (failures > 0) process.exit(1);
  });
