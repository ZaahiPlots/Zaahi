// React hook that drives MapLibre's directional light from a solar
// position computation, so 3D fill-extrusions cast realistic shadows
// matching the current time of day in Dubai. Updates once per minute
// (low cost — sun motion is ~0.25° per minute) or any time the time
// override changes from the slider UI.
//
// MapLibre style spec `light.position` is `[radial, azimuthal, polar]`
// where azimuthal is **degrees from north** (compass) and polar is
// **degrees from the up-axis** (90 = sun on horizon, 0 = sun overhead).
// Our SunPosition has compass azimuth + altitude from horizon, so:
//   azimuthal = azimuth
//   polar     = 90 - altitude
//
// Founder spec ties anchor='viewport' — the light direction stays
// consistent with screen space as the user pans, which matches the
// look in s1.estate. CLAUDE.md forbids touching fill-extrusion-opacity
// or ZAAHI Signature 3D tier logic; setLight does not touch either.

import { useEffect, useRef, type RefObject } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { getSunPosition } from "@/lib/sun-position";

const DUBAI_LAT = 25.2;
const DUBAI_LNG = 55.27;
const UPDATE_MS = 60_000;

interface UseSunLightOptions {
  /** When set, override the real-time Date with a synthetic one (e.g.
   *  from the slider). Recomputes light immediately on change. */
  overrideDate?: Date | null;
  /** Disable to skip the effect entirely (e.g. while running tests). */
  enabled?: boolean;
}

export function useSunLight(
  mapRef: RefObject<MLMap | null>,
  opts: UseSunLightOptions = {},
): void {
  const { overrideDate = null, enabled = true } = opts;
  // Keep the latest override in a ref so the interval can read it
  // without re-subscribing every render.
  const overrideRef = useRef<Date | null>(overrideDate);
  overrideRef.current = overrideDate;

  // Single helper used by both the 1-minute interval and the
  // override-changed effect below. Polls mapRef.current at call time so
  // it tolerates being invoked before the map has finished mounting.
  function applyOnce(when: Date) {
    const map = mapRef.current;
    if (!map) return;
    const sun = getSunPosition(when, DUBAI_LAT, DUBAI_LNG);
    const polar = 90 - sun.altitude;
    try {
      // [radial, azimuthal_deg, polar_deg]. Radial 1.5 keeps the
      // light at a sensible distance for shadow casting.
      map.setLight({
        anchor: "viewport",
        position: [1.5, sun.azimuth, polar],
        color: sun.color,
        intensity: sun.intensity,
      });
    } catch {
      /* Style not loaded yet — next interval tick will retry. */
    }
  }

  useEffect(() => {
    if (!enabled) return;
    // First tick happens immediately. If the map isn't ready yet the
    // applyOnce call is a no-op; the interval keeps re-trying every
    // 60 s, and the override-effect below also retries on slider
    // changes. Sun motion is ~0.25°/min, so a 60-second poll is
    // imperceptibly stale and cheap.
    applyOnce(overrideRef.current ?? new Date());
    const id = window.setInterval(() => {
      applyOnce(overrideRef.current ?? new Date());
    }, UPDATE_MS);
    return () => {
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, enabled]);

  // Re-apply immediately when the slider override changes — separate
  // effect so the 1-minute interval keeps ticking independently.
  useEffect(() => {
    if (!enabled) return;
    applyOnce(overrideDate ?? new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, overrideDate, enabled]);
}
