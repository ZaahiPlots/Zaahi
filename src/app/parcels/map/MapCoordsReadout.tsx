"use client";

// ZAAHI — live cursor lat/lng readout for the coords overlay.
//
// perf-2026-08-21 item 2. Replaces a React-state mirror in page.tsx
// (`const [cursor, setCursor] = useState(...)` fed by
// `map.on("mousemove", e => setCursor({lng, lat}))`) that forced a full
// MapPage re-render on every pointer sample. The handler built a fresh object
// literal each event, so Object.is never matched and React could never bail
// out; MapLibre fires mousemove at pointer rate (60 Hz, 120+ Hz on a
// high-refresh display or precision trackpad), and ParcelsMapPageInner is
// ~6,300 lines with 57 useState hooks and no memoised children — FilterPanel,
// ArchibaldChat and SidePanel are all mounted unconditionally and re-rendered
// on every one of those commits. The single consumer was this readout.
//
// Same shape as MapZoomReadout (2026-06-11, which fixed the identical bug for
// the zoom mirror): the component owns its own listener + rAF loop and mutates
// one span's textContent when the formatted value actually changes. Zero React
// reconciliation on the parent during pointer movement.
//
// The mousemove handler writes to a ref rather than driving the DOM directly,
// and the rAF loop does the write — so DOM updates are capped at one per
// frame even when the pointer samples faster than the display refreshes.

import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";

interface Props {
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
}

// Dubai default — matches the map's initial centre so the readout shows a
// plausible value before the pointer first enters the canvas.
const INITIAL_LNG = 55.27;
const INITIAL_LAT = 25.2;

export default function MapCoordsReadout({ mapRef }: Props) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const posRef = useRef({ lng: INITIAL_LNG, lat: INITIAL_LAT });

  useEffect(() => {
    const onMove = (e: maplibregl.MapMouseEvent) => {
      posRef.current.lng = e.lngLat.lng;
      posRef.current.lat = e.lngLat.lat;
    };

    // The map does not exist yet when this effect first runs: React flushes
    // child effects BEFORE the parent's, and ParcelsMapPageInner constructs the
    // map inside its own effect. Subscribing eagerly here would read a null
    // mapRef, bail, and — with a stable [mapRef] dep — never retry, leaving the
    // readout frozen at its initial value. So the rAF loop, which is running
    // anyway, also does the attach on the first frame the map exists. Same
    // read-mapRef-live discipline as MapZoomReadout.
    let attached: maplibregl.Map | null = null;
    let raf = 0;
    let prev = "";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const map = mapRef.current;
      if (map && map !== attached) {
        if (attached) attached.off("mousemove", onMove);
        map.on("mousemove", onMove);
        attached = map;
      }
      const span = spanRef.current;
      if (!span) return;
      const { lng, lat } = posRef.current;
      const next = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      if (next !== prev) {
        span.textContent = next;
        prev = next;
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      if (attached) attached.off("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [mapRef]);

  return (
    <span ref={spanRef}>
      {INITIAL_LAT.toFixed(5)}, {INITIAL_LNG.toFixed(5)}
    </span>
  );
}
