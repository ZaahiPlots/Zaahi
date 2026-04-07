/**
 * Equirectangular projection of WGS84 lon/lat into local meters around a
 * reference centroid. Good enough for plot-sized polygons (< few km).
 */
const R = 6378137;

export function lngLatToLocalMeters(
  ring: number[][],
  centerLng: number,
  centerLat: number,
): Array<[number, number]> {
  const lat0 = (centerLat * Math.PI) / 180;
  return ring.map(([lng, lat]) => {
    const x = ((lng - centerLng) * Math.PI) / 180 * R * Math.cos(lat0);
    const y = ((lat - centerLat) * Math.PI) / 180 * R;
    return [x, y];
  });
}

export function polygonCentroid(ring: number[][]): { lng: number; lat: number } {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
  }
  return { lng: sx / ring.length, lat: sy / ring.length };
}
