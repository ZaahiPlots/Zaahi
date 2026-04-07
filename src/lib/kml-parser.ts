/**
 * Tight KML → GeoJSON parser for Dubai Pulse exports.
 *
 * Supports:
 *   - Polygon (single outer ring) and MultiPolygon
 *   - LineString and MultiLineString (incl. inside MultiGeometry)
 *
 * NOT supported (intentionally — these don't appear in our datasets):
 *   - Polygon inner rings (holes)
 *   - GeometryCollection mixing polygons and lines
 *   - Point/MultiPoint
 *
 * Attribute names are passed in by the caller; we read SimpleData blocks.
 */

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseRing(coordsText: string): GeoJSON.Position[] {
  const out: GeoJSON.Position[] = [];
  for (const triple of coordsText.trim().split(/\s+/)) {
    const [lngStr, latStr] = triple.split(',');
    const lng = parseFloat(lngStr);
    const lat = parseFloat(latStr);
    if (Number.isFinite(lng) && Number.isFinite(lat)) out.push([lng, lat]);
  }
  return out;
}

const PLACEMARK_RE = /<Placemark[\s\S]*?<\/Placemark>/g;
const SIMPLE_DATA_RE = /<SimpleData\s+name="([^"]+)">([^<]*)<\/SimpleData>/g;
const POLYGON_RE = /<Polygon[\s\S]*?<\/Polygon>/g;
const LINESTRING_RE = /<LineString[\s\S]*?<\/LineString>/g;
const COORDS_RE = /<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/;

function extractGeometry(pm: string): GeoJSON.Geometry | null {
  // --- polygons ---
  const polyBlocks = pm.match(POLYGON_RE) ?? [];
  const polys: GeoJSON.Position[][][] = [];
  for (const block of polyBlocks) {
    const cm = block.match(COORDS_RE);
    if (!cm) continue;
    const ring = parseRing(cm[1]);
    if (ring.length >= 4) polys.push([ring]);
  }
  if (polys.length === 1) {
    return { type: 'Polygon', coordinates: polys[0] };
  }
  if (polys.length > 1) {
    return { type: 'MultiPolygon', coordinates: polys };
  }

  // --- linestrings ---
  const lineBlocks = pm.match(LINESTRING_RE) ?? [];
  const lines: GeoJSON.Position[][] = [];
  for (const block of lineBlocks) {
    const cm = block.match(COORDS_RE);
    if (!cm) continue;
    const ring = parseRing(cm[1]);
    if (ring.length >= 2) lines.push(ring);
  }
  if (lines.length === 1) {
    return { type: 'LineString', coordinates: lines[0] };
  }
  if (lines.length > 1) {
    return { type: 'MultiLineString', coordinates: lines };
  }

  return null;
}

export function parseKml(
  kml: string,
  options: { attrs: string[]; idAttr?: string },
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const placemarks = kml.match(PLACEMARK_RE) ?? [];

  for (const pm of placemarks) {
    const props: Record<string, string> = {};
    const sdRe = new RegExp(SIMPLE_DATA_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = sdRe.exec(pm))) {
      props[m[1]] = decode(m[2]);
    }

    const geom = extractGeometry(pm);
    if (!geom) continue;

    const out: Record<string, string | null> = {};
    for (const a of options.attrs) out[a] = props[a] ?? null;

    const idVal = options.idAttr ? props[options.idAttr] : undefined;

    features.push({
      type: 'Feature',
      ...(idVal ? { id: idVal } : {}),
      geometry: geom,
      properties: out,
    });
  }

  return { type: 'FeatureCollection', features };
}

// Back-compat shim for the existing communities endpoint.
export function parseCommunitiesKml(kml: string): GeoJSON.FeatureCollection {
  return parseKml(kml, {
    attrs: ['CNAME_E', 'CNAME_A', 'COMM_NUM', 'OBJECTID'],
    idAttr: 'COMM_NUM',
  });
}
