// Simplified NOAA solar-position algorithm. Returns the sun's azimuth +
// altitude for a given UTC instant and observer lat/lng. Accurate enough
// to drive a MapLibre directional light (i.e. shadow direction) — well
// within a degree or two of NOAA's full reference implementation.
//
// Conventions:
//   altitude — degrees above horizon. 0 = on horizon, 90 = zenith,
//              negative = below horizon (sun is set).
//   azimuth  — degrees clockwise from due NORTH. 0 = N, 90 = E,
//              180 = S, 270 = W. This is compass bearing, which is what
//              MapLibre's light position azimuthal axis expects (style
//              spec: "azimuthal angle from due north in degrees").
//
// Dubai defaults: lat = 25.2, lng = 55.27.

export interface SunPosition {
  /** Compass bearing of the sun, 0..360 (0 = N). */
  azimuth: number;
  /** Elevation above horizon, -90..90. Negative = below horizon. */
  altitude: number;
  /** Recommended directional-light colour for this sun position. */
  color: string;
  /** Recommended light intensity 0..1 for this sun position. */
  intensity: number;
}

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Convert a JS Date to Julian Day (UT). */
function julianDay(date: Date): number {
  // JD epoch is noon UT on 4713 BC Jan 1 (Julian calendar). The unix
  // epoch corresponds to JD 2440587.5.
  return date.getTime() / 86400000 + 2440587.5;
}

export function getSunPosition(date: Date, lat: number, lng: number): SunPosition {
  const JD = julianDay(date);
  const n = JD - 2451545.0; // days since J2000.0

  // Mean longitude (degrees), normalised to 0..360
  const L = (280.460 + 0.9856474 * n) % 360;
  // Mean anomaly (radians)
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
  // Ecliptic longitude (radians)
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
  // Obliquity of ecliptic (radians) — tiny secular change, fine to ignore
  // higher-order terms for a shadow direction.
  const epsilon = (23.439 - 0.0000004 * n) * RAD;

  // Right ascension + declination
  const alpha = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
  const delta = Math.asin(Math.sin(epsilon) * Math.sin(lambda));

  // Greenwich Mean Sidereal Time (hours), then local sidereal time (rad).
  const GMSThours = (18.697374558 + 24.06570982441908 * n) % 24;
  const LSTrad = (GMSThours * 15 + lng) * RAD;

  // Hour angle (radians) — how far the sun has moved past the meridian.
  const H = LSTrad - alpha;

  const latRad = lat * RAD;

  // Altitude (radians) — standard horizontal-coordinates formula.
  const altRad = Math.asin(
    Math.sin(latRad) * Math.sin(delta) + Math.cos(latRad) * Math.cos(delta) * Math.cos(H),
  );

  // Azimuth from north, increasing east (compass). Verified at solar
  // noon (H=0) in N. hemisphere with lat > delta, returns 180° (S).
  const azRad = Math.atan2(
    -Math.sin(H),
    Math.cos(latRad) * Math.tan(delta) - Math.sin(latRad) * Math.cos(H),
  );

  const altitude = altRad * DEG;
  let azimuth = azRad * DEG;
  azimuth = ((azimuth % 360) + 360) % 360;

  const { color, intensity } = lightingForAltitude(altitude);

  return { azimuth, altitude, color, intensity };
}

/** Map solar altitude to a warm-to-cool light colour + intensity ramp. */
function lightingForAltitude(altitude: number): { color: string; intensity: number } {
  if (altitude < 0) {
    // Night — deep navy ambient. We still send the light so the
    // extrusion side that would be lit has *some* tone, not pure black.
    return { color: "#0A1628", intensity: 0.1 };
  }
  if (altitude < 10) {
    // Sunrise / sunset — warm orange.
    return { color: "#FF8C42", intensity: 0.4 };
  }
  if (altitude < 30) {
    // Morning / late afternoon — warm cream.
    return { color: "#FFD4A3", intensity: 0.6 };
  }
  if (altitude < 60) {
    // Mid-day — neutral white.
    return { color: "#FFFFFF", intensity: 0.9 };
  }
  // Solar zenith — peak white.
  return { color: "#FFFFFF", intensity: 1.0 };
}
