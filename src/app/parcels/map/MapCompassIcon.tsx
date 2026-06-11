"use client";

// ZAAHI — live compass icon for the "Reset bearing" rail button.
//
// 2026-06-11 (perf fix on feat/keyboard-nav). Replaces a React-state
// mirror (page.tsx `[bearing, setBearing] = useState(0)` + map.on
// ("rotate", () => setBearing(...))) that was forcing a full MapPage
// re-render on every camera tick. Under always-on keyboard nav the
// camera rotates ~60 Hz, so the parent reconciled its 8000-line JSX
// tree 60 times per second.
//
// This component owns its own rAF loop and only mutates one inline
// style property (transform: rotate) when the angle actually
// changes — zero React reconciliation on the parent during keyboard
// nav. The 250 ms ease transition is preserved so click-driven
// "Reset bearing" easeTo continues to snap smoothly.

import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";

interface Props {
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
}

export default function MapCompassIcon({ mapRef }: Props) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let prev = Number.NaN;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const m = mapRef.current;
      const span = spanRef.current;
      if (!m || !span) return;
      const next = -m.getBearing();
      if (next !== prev) {
        span.style.transform = `rotate(${next}deg)`;
        prev = next;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mapRef]);

  return (
    <span
      ref={spanRef}
      style={{
        display: "inline-block",
        transform: "rotate(0deg)",
        transition: "transform 250ms ease",
        fontSize: 14,
      }}
    >
      ⊕
    </span>
  );
}
