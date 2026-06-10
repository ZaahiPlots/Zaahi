// District / community boundary index for Archie's fly_to_district tool.
//
// Wave 3a fix (founder spec 2026-06-10, see
// docs/research/archie-expansion-2026-06-10.md §A.4).
//
// PRE-FIX behaviour: /api/archie/resolve-district computed a bbox from
// the geometries of Parcel rows matching the user-typed district name.
// For districts with 0-3 ZAAHI listings the bbox was a 200×200 m box
// around the plots — visually "showing parcels", not the district.
// After the 2026-06-10 listings-to-vault migration the 111 LISTED rows
// moved to VAULT_PRIVATE, so for a non-vault-owner the previous lookup
// returned 404 not_found for every former-listing district.
//
// POST-FIX behaviour: this module loads the boundary GeoJSON / KML
// files that ship in data/layers/ and builds an in-memory index of
// district name → bbox + polygon. resolve-district uses the boundary
// first, falls back to the legacy parcel-bbox logic only when no
// boundary entry matches.
//
// Sources indexed (best-coverage first; lookup tries each in order):
//   1. data/layers/dda-projects.geojson           — 209 Dubai project polygons (ProjectName).
//                                                   Covers ARJAN, MAJAN, DUBAI HILLS, DAMAC HILLS, JABEL ALI HILLS,
//                                                   BURJ KHALIFA DISTRICT, BUSINESS BAY PHASE 1 & 2 — the names
//                                                   real-estate users actually type.
//   2. data/layers/Community__1_.kml              — 224 Dubai DLD communities (CNAME_E via parseCommunitiesKml).
//   3. data/layers/abu-dhabi-districts.geojson    — 216 AD districts (NAMEENGLISH).
//   4. data/layers/abu-dhabi-communities.geojson  — 1864 AD communities (COMMUNITYNAMEENG).
//   5. data/layers/abu-dhabi-municipalities.geojson — 3 AD municipalities (Al Ain, Abu Dhabi, Al Dhafra).
//
// The lookup is name-only (no synonyms maintained here). The Archie
// SYSTEM_PROMPT already instructs the model to transliterate Russian /
// Arabic to the canonical Latin form before calling the tool, so the
// index keys are uppercase Latin.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseCommunitiesKml } from "@/lib/kml-parser";

export type DistrictSource =
  | "dubai-community"
  | "dda-project"
  | "ad-district"
  | "ad-community"
  | "ad-municipality";

export interface DistrictBoundary {
  /** Canonical display name (as stored in the source file). */
  name: string;
  /** Source file that supplied this boundary. */
  source: DistrictSource;
  /** [[minLng, minLat], [maxLng, maxLat]] computed from the polygon ring(s). */
  bounds: [[number, number], [number, number]];
  /** [lng, lat] centroid of the bbox. */
  center: [number, number];
  /** Original GeoJSON polygon — useful for client-side outline highlight. */
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

// ── Bbox math ─────────────────────────────────────────────────────

interface MutableBbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

function fresh(): MutableBbox {
  return { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity };
}

function extendFromRing(ring: GeoJSON.Position[], b: MutableBbox): void {
  for (const p of ring) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const lng = p[0];
    const lat = p[1];
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (lng < b.minLng) b.minLng = lng;
    if (lat < b.minLat) b.minLat = lat;
    if (lng > b.maxLng) b.maxLng = lng;
    if (lat > b.maxLat) b.maxLat = lat;
  }
}

function bboxFromGeometry(geom: GeoJSON.Geometry): MutableBbox | null {
  const b = fresh();
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) extendFromRing(ring, b);
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates) {
      for (const ring of poly) extendFromRing(ring, b);
    }
  } else {
    return null;
  }
  if (!Number.isFinite(b.minLng)) return null;
  return b;
}

// ── Index build ───────────────────────────────────────────────────

// Normalisation: uppercase, trim, collapse whitespace, drop punctuation.
// The Archie prompt sends Latin already; this is just safety.
function normaliseKey(input: string): string {
  return input
    .toUpperCase()
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const REPO_ROOT = process.cwd();
const DATA_DIR = join(REPO_ROOT, "data", "layers");

interface IndexBuild {
  /** key normalised → first-match boundary. */
  byKey: Map<string, DistrictBoundary>;
  /** key normalised → list of all matches (kept for contains-search). */
  all: DistrictBoundary[];
}

let cache: IndexBuild | null = null;

function pushEntry(build: IndexBuild, entry: DistrictBoundary, keys: string[]): void {
  build.all.push(entry);
  for (const raw of keys) {
    const k = normaliseKey(raw);
    if (!k) continue;
    if (!build.byKey.has(k)) build.byKey.set(k, entry);
  }
}

// Helper: only accept popular-name field as a key alias when the value
// is actually Latin (some AD rows have Arabic in NAMEPOPULARENGLISH and
// some have the literal "لايوجد" meaning "doesn't exist").
function latinOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^[\sA-Za-z0-9.\-'/&,]+$/.test(value)) return null;
  return value;
}

function loadAbuDhabiDistricts(build: IndexBuild): void {
  const path = join(DATA_DIR, "abu-dhabi-districts.geojson");
  if (!existsSync(path)) return;
  const fc = JSON.parse(readFileSync(path, "utf8")) as GeoJSON.FeatureCollection;
  for (const f of fc.features ?? []) {
    if (!f.geometry || (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon")) continue;
    const b = bboxFromGeometry(f.geometry);
    if (!b) continue;
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const enName = typeof props.NAMEENGLISH === "string" ? props.NAMEENGLISH : null;
    const popular = latinOrNull(props.NAMEPOPULARENGLISH);
    if (!enName) continue;
    const entry: DistrictBoundary = {
      // Display = enName always. Popular field is only useful as a
      // matching alias (when Latin), never as canonical name.
      name: enName,
      source: "ad-district",
      bounds: [[b.minLng, b.minLat], [b.maxLng, b.maxLat]],
      center: [(b.minLng + b.maxLng) / 2, (b.minLat + b.maxLat) / 2],
      polygon: f.geometry,
    };
    const keys = [enName];
    if (popular) keys.push(popular);
    pushEntry(build, entry, keys);
  }
}

function loadDdaProjects(build: IndexBuild): void {
  const path = join(DATA_DIR, "dda-projects.geojson");
  if (!existsSync(path)) return;
  const fc = JSON.parse(readFileSync(path, "utf8")) as GeoJSON.FeatureCollection;
  for (const f of fc.features ?? []) {
    if (!f.geometry || (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon")) continue;
    const b = bboxFromGeometry(f.geometry);
    if (!b) continue;
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const name = typeof props.ProjectName === "string" ? props.ProjectName : null;
    if (!name) continue;
    // Skip "MERAAS PLOT 3460266" style auto-generated project names — they're
    // single-plot anchors that pollute the contains-match. Heuristic: name
    // starting with "MERAAS PLOT " or matching /\bPLOT\s+\d+/ near the end.
    if (/\bPLOT\s+\d{4,}\b/i.test(name)) continue;
    const community = typeof props.CommunityName === "string" ? props.CommunityName : null;
    const entry: DistrictBoundary = {
      name,
      source: "dda-project",
      bounds: [[b.minLng, b.minLat], [b.maxLng, b.maxLat]],
      center: [(b.minLng + b.maxLng) / 2, (b.minLat + b.maxLat) / 2],
      polygon: f.geometry,
    };
    const keys = [name];
    if (community) keys.push(community);
    pushEntry(build, entry, keys);
  }
}

function loadAbuDhabiMunicipalities(build: IndexBuild): void {
  const path = join(DATA_DIR, "abu-dhabi-municipalities.geojson");
  if (!existsSync(path)) return;
  const fc = JSON.parse(readFileSync(path, "utf8")) as GeoJSON.FeatureCollection;
  for (const f of fc.features ?? []) {
    if (!f.geometry || (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon")) continue;
    const b = bboxFromGeometry(f.geometry);
    if (!b) continue;
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const enName = typeof props.NAMEENGLISH === "string" ? props.NAMEENGLISH : null;
    if (!enName) continue;
    const entry: DistrictBoundary = {
      name: enName,
      source: "ad-municipality",
      bounds: [[b.minLng, b.minLat], [b.maxLng, b.maxLat]],
      center: [(b.minLng + b.maxLng) / 2, (b.minLat + b.maxLat) / 2],
      polygon: f.geometry,
    };
    pushEntry(build, entry, [enName]);
  }
}

function loadAbuDhabiCommunities(build: IndexBuild): void {
  const path = join(DATA_DIR, "abu-dhabi-communities.geojson");
  if (!existsSync(path)) return;
  const fc = JSON.parse(readFileSync(path, "utf8")) as GeoJSON.FeatureCollection;
  for (const f of fc.features ?? []) {
    if (!f.geometry || (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon")) continue;
    const b = bboxFromGeometry(f.geometry);
    if (!b) continue;
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const enName = typeof props.COMMUNITYNAMEENG === "string" ? props.COMMUNITYNAMEENG : null;
    if (!enName) continue;
    const entry: DistrictBoundary = {
      name: enName,
      source: "ad-community",
      bounds: [[b.minLng, b.minLat], [b.maxLng, b.maxLat]],
      center: [(b.minLng + b.maxLng) / 2, (b.minLat + b.maxLat) / 2],
      polygon: f.geometry,
    };
    pushEntry(build, entry, [enName]);
  }
}

function loadDubaiCommunities(build: IndexBuild): void {
  const path = join(DATA_DIR, "Community__1_.kml");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  const fc = parseCommunitiesKml(text);
  for (const f of fc.features ?? []) {
    if (!f.geometry || (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon")) continue;
    const b = bboxFromGeometry(f.geometry);
    if (!b) continue;
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const enName = typeof props.CNAME_E === "string" ? props.CNAME_E : null;
    if (!enName) continue;
    const entry: DistrictBoundary = {
      name: enName,
      source: "dubai-community",
      bounds: [[b.minLng, b.minLat], [b.maxLng, b.maxLat]],
      center: [(b.minLng + b.maxLng) / 2, (b.minLat + b.maxLat) / 2],
      polygon: f.geometry,
    };
    pushEntry(build, entry, [enName]);
  }
}

function build(): IndexBuild {
  if (cache) return cache;
  const next: IndexBuild = { byKey: new Map(), all: [] };
  // Load order matters: the FIRST loader to register a normalised key
  // "wins" the byKey slot. DDA projects + AD municipalities (curated,
  // user-friendly names) before community polygons (more granular,
  // sometimes overlap).
  try { loadAbuDhabiMunicipalities(next); } catch (e) { console.warn("[district-boundaries] AD municipalities:", (e as Error).message); }
  try { loadDdaProjects(next); } catch (e) { console.warn("[district-boundaries] DDA projects:", (e as Error).message); }
  try { loadDubaiCommunities(next); } catch (e) { console.warn("[district-boundaries] Dubai communities:", (e as Error).message); }
  try { loadAbuDhabiDistricts(next); } catch (e) { console.warn("[district-boundaries] AD districts:", (e as Error).message); }
  try { loadAbuDhabiCommunities(next); } catch (e) { console.warn("[district-boundaries] AD communities:", (e as Error).message); }
  cache = next;
  return next;
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Look up a district / community by name. Tries:
 *   1. exact (normalised) key match
 *   2. contains substring on any indexed key (returns first hit)
 *
 * Returns null when nothing matches — caller falls back to the
 * legacy parcel-bbox lookup. Optional `prefer` biases the search to
 * a specific source when the user already implied an emirate.
 */
export function lookupDistrict(
  rawName: string,
  prefer?: DistrictSource,
): DistrictBoundary | null {
  const idx = build();
  const key = normaliseKey(rawName);
  if (!key) return null;

  // (1) exact
  const exact = idx.byKey.get(key);
  if (exact && (!prefer || exact.source === prefer)) return exact;
  if (exact) {
    // We had an exact match but it's the wrong source bias — look for
    // a same-key entry from the preferred source first.
    const sameKeyPreferred = idx.all.find(
      (e) => e.source === prefer && normaliseKey(e.name) === key,
    );
    if (sameKeyPreferred) return sameKeyPreferred;
    return exact;
  }

  // (2) contains — preferred source first, then any. Rank by shorter
  // name (more specific match — "AL AIN" beats "AL AIN INTERNATIONAL
  // AIRPORT" when the user typed "Al Ain").
  function bestContains(pool: DistrictBoundary[]): DistrictBoundary | null {
    let best: DistrictBoundary | null = null;
    let bestLen = Infinity;
    for (const e of pool) {
      const k = normaliseKey(e.name);
      if (!k.includes(key)) continue;
      if (k.length < bestLen) {
        best = e;
        bestLen = k.length;
      }
    }
    return best;
  }
  if (prefer) {
    const preferredHit = bestContains(idx.all.filter((e) => e.source === prefer));
    if (preferredHit) return preferredHit;
  }
  return bestContains(idx.all);
}

/** Force the index to build now (warm cold cache). Useful for tests. */
export function warmDistrictIndex(): { ad: number; adCommunity: number; dubai: number; total: number } {
  const idx = build();
  let ad = 0;
  let adCommunity = 0;
  let dubai = 0;
  for (const e of idx.all) {
    if (e.source === "ad-district") ad++;
    else if (e.source === "ad-community") adCommunity++;
    else dubai++;
  }
  return { ad, adCommunity, dubai, total: idx.all.length };
}

// ── Reverse lookup: which district contains a point? ──────────────
// Used by /api/archie/reverse-district (Wave 3c proactive Archie). The
// hot path is a coarse AABB pre-filter over all 2.5K boundaries (cheap
// O(N) numeric comparisons) followed by a precise point-in-polygon test
// only on the small candidate set that survives. Returns the SMALLEST
// (most specific) polygon when multiple match — so a point inside both
// "Business Bay" (DDA project, large) and a contained AD community
// returns the project, not the wider envelope, when the project is more
// specific.

function pointInRing(lng: number, lat: number, ring: GeoJSON.Position[]): boolean {
  // Standard crossing-number / ray-casting test. The ring is closed
  // (first === last) per GeoJSON spec but we don't assume — wrap.
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!Array.isArray(a) || !Array.isArray(b) || a.length < 2 || b.length < 2) continue;
    const xi = a[0];
    const yi = a[1];
    const xj = b[0];
    const yj = b[1];
    const intersect =
      ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInGeometry(
  lng: number,
  lat: number,
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): boolean {
  if (geom.type === "Polygon") {
    // First ring is the outer; subsequent rings are holes. MVP for
    // ZAAHI data — most rows are single-ring polygons; we still respect
    // holes for correctness.
    const rings = geom.coordinates;
    if (rings.length === 0) return false;
    if (!pointInRing(lng, lat, rings[0])) return false;
    for (let r = 1; r < rings.length; r++) {
      if (pointInRing(lng, lat, rings[r])) return false; // inside a hole
    }
    return true;
  }
  // MultiPolygon — true if inside any sub-polygon.
  for (const poly of geom.coordinates) {
    if (poly.length === 0) continue;
    if (!pointInRing(lng, lat, poly[0])) continue;
    let inHole = false;
    for (let r = 1; r < poly.length; r++) {
      if (pointInRing(lng, lat, poly[r])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

function bboxArea(b: [[number, number], [number, number]]): number {
  return (b[1][0] - b[0][0]) * (b[1][1] - b[0][1]);
}

// Heuristic: AD's sub-community grid uses short alphanumeric codes
// ("SDN1", "YN6", "RS6") that mean nothing to users. When a code-named
// polygon is the smallest hit but a slightly larger "human-named"
// polygon also contains the same point, prefer the human one — the
// proactive Archie nudge text reads better as "looking at YAS ISLAND"
// than "looking at YN6".
function looksLikeCode(name: string): boolean {
  return /^[A-Z]{1,4}\d+$/.test(name.trim());
}

/**
 * Find the boundary polygon that contains (lng, lat). Returns the
 * smallest (most specific) hit, preferring human-named polygons over
 * short alphanumeric AD sub-community codes (SDN1/YN6/etc). Null when
 * no boundary matches.
 *
 * Performance: O(N) bbox pre-filter (one numeric compare per side ×
 * 2,513 rows) typically narrows to ≤5 candidates for a single UAE
 * point, then full point-in-polygon on those. Cold-call total stays
 * under ~10 ms on a modern CPU.
 */
export function findDistrictAtPoint(
  lng: number,
  lat: number,
): DistrictBoundary | null {
  const idx = build();
  // Pre-filter: bbox containment is cheap; surviving candidates are
  // few (typically 0-5 for a UAE coordinate).
  const candidates: DistrictBoundary[] = [];
  for (const e of idx.all) {
    const [[minLng, minLat], [maxLng, maxLat]] = e.bounds;
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) continue;
    candidates.push(e);
  }
  if (candidates.length === 0) return null;
  // Sort by bbox area ascending so the first containing polygon we
  // find is also the smallest (most specific). Collect every hit so
  // we can apply the "prefer named over code" rule across them.
  candidates.sort((a, b) => bboxArea(a.bounds) - bboxArea(b.bounds));
  const hits: DistrictBoundary[] = [];
  for (const c of candidates) {
    if (pointInGeometry(lng, lat, c.polygon)) hits.push(c);
  }
  if (hits.length === 0) return null;
  // First hit is the smallest. If it's a code, see whether any of the
  // next-smallest hits have a human name and return that instead.
  const smallest = hits[0];
  if (!looksLikeCode(smallest.name)) return smallest;
  for (let i = 1; i < hits.length; i++) {
    if (!looksLikeCode(hits[i].name)) return hits[i];
  }
  return smallest;
}
