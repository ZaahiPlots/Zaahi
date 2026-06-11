"use client";

// ZAAHI — live zoom readout for the coords overlay.
//
// 2026-06-11 (perf fix on feat/keyboard-nav). Replaces a React-state
// mirror (page.tsx `[zoom, setZoom] = useState(12)` + map.on("zoom",
// () => setZoom(...))) that was forcing a full MapPage re-render on
// every camera tick. Under always-on keyboard nav the camera moves
// ~60 Hz, so the parent reconciled its 8000-line JSX tree 60 times
// per second.
//
// This component owns its own rAF loop and only mutates a single
// span's textContent when the value actually changes — zero React
// reconciliation on the parent during keyboard nav.

import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";

interface Props {
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
}

export default function MapZoomReadout({ mapRef }: Props) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let prev = "";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const m = mapRef.current;
      const span = spanRef.current;
      if (!m || !span) return;
      const next = m.getZoom().toFixed(2);
      if (next !== prev) {
        span.textContent = next;
        prev = next;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mapRef]);

  return <span ref={spanRef}>12.00</span>;
}
