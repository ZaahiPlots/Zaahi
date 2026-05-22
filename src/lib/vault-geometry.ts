// ZAAHI Vault — geometry helpers.
//
// When a non-DDA vault entry has user-entered (latitude, longitude) but no
// real polygon yet, we synthesise a tiny square placeholder polygon so the
// entry is visible on the map. Phase 2.2 (affection-plan PDF upload) replaces
// these placeholders with real parsed geometries.

/**
 * Build a small square polygon around a lat/lng point.
 *
 * Approximation: 1° latitude ≈ 111,320 m; 1° longitude ≈ 111,320 × cos(lat) m.
 * Good enough at vault-marker scale (5–10 m). Don't use this for anything
 * that needs metric precision.
 */
export function synthesizePlaceholderPolygon(
  lat: number,
  lng: number,
  sizeMeters: number = 5,
): GeoJSON.Polygon {
  const latDelta = sizeMeters / 111_320;
  const lngDelta = sizeMeters / (111_320 * Math.cos((lat * Math.PI) / 180));
  return {
    type: "Polygon",
    coordinates: [[
      [lng - lngDelta, lat - latDelta],
      [lng + lngDelta, lat - latDelta],
      [lng + lngDelta, lat + latDelta],
      [lng - lngDelta, lat + latDelta],
      [lng - lngDelta, lat - latDelta],
    ]],
  };
}
