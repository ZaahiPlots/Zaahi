/**
 * Tight KML → GeoJSON parser for Dubai Community boundaries.
 *
 * Optimised for the specific Dubai Pulse community KML format:
 *   - 1 Placemark per community
 *   - Each Placemark has ExtendedData/SimpleData attributes and a single Polygon
 *     with outerBoundaryIs/LinearRing/coordinates (no inner rings, no MultiGeometry)
 *
 * If the source format ever changes (MultiGeometry, holes), upgrade to
 * @tmcw/togeojson — for now this saves a dependency.
 */

export interface CommunityProperties {
  CNAME_E: string | null;
  CNAME_A: string | null;
  COMM_NUM: string | null;
  OBJECTID: string | null;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseRing(coordsText: string): number[][] {
  return coordsText
    .trim()
    .split(/\s+/)
    .map((triple) => {
      const [lng, lat] = triple.split(',');
      return [parseFloat(lng), parseFloat(lat)];
    })
    .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
}

const SIMPLE_DATA_RE = /<SimpleData\s+name="([^"]+)">([^<]*)<\/SimpleData>/g;
const COORDS_RE = /<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/;
const PLACEMARK_RE = /<Placemark[\s\S]*?<\/Placemark>/g;

export function parseCommunitiesKml(kml: string): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const placemarks = kml.match(PLACEMARK_RE) ?? [];

  for (const pm of placemarks) {
    const props: Record<string, string> = {};
    let m: RegExpExecArray | null;
    const sdRe = new RegExp(SIMPLE_DATA_RE.source, 'g');
    while ((m = sdRe.exec(pm))) {
      props[m[1]] = decode(m[2]);
    }

    const coordsMatch = pm.match(COORDS_RE);
    if (!coordsMatch) continue;
    const ring = parseRing(coordsMatch[1]);
    if (ring.length < 4) continue;

    const cprops: CommunityProperties = {
      CNAME_E: props.CNAME_E ?? null,
      CNAME_A: props.CNAME_A ?? null,
      COMM_NUM: props.COMM_NUM ?? null,
      OBJECTID: props.OBJECTID ?? null,
    };

    features.push({
      type: 'Feature',
      id: cprops.COMM_NUM ?? cprops.OBJECTID ?? undefined,
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: cprops,
    });
  }

  return { type: 'FeatureCollection', features };
}
