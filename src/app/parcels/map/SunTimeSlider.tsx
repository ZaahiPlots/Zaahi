"use client";

// Hour-of-day slider that overrides the time fed into the solar
// position calculator. Lives bottom-right of the map, above MapLibre's
// own zoom buttons (which sit at top-right via CSS in page.tsx — so
// this floater is free to anchor bottom-right). Double-click to clear
// the override and snap back to live time.
//
// State convention:
//   overrideHour === null → use real wall-clock time
//   overrideHour ∈ [0, 24] → today's date with that fractional hour
//
// We hand the parent a Date so this component owns the hour↔Date math
// and the parent doesn't have to know about the override semantics.

import { useEffect, useState, type ChangeEvent } from "react";

const GOLD = "#C8A96E";

interface SunTimeSliderProps {
  /** Receives `null` when the user double-clicks to reset, otherwise a
   *  synthetic Date pinned to today at the chosen hour. */
  onChange: (date: Date | null) => void;
}

function dateAtHour(hour: number): Date {
  const d = new Date();
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  d.setHours(h, m, 0, 0);
  return d;
}

function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Default override time per founder spec 2026-05-23 — 08:15 catches
// the warm dawn-shadow look that reads best against Dubai's
// glass-tower geometry. Decimal hour: 8 + 15/60 = 8.25.
const DEFAULT_OVERRIDE_HOUR = 8.25;

export default function SunTimeSlider({ onChange }: SunTimeSliderProps) {
  // Slider starts at the founder-chosen default time, not real
  // wall-clock — and we push that override up to the parent on mount
  // so the directional light snaps to 08:15 the moment the slider
  // mounts. Double-clicking still clears back to live time.
  const [overrideHour, setOverrideHour] = useState<number | null>(DEFAULT_OVERRIDE_HOUR);
  const displayHour = overrideHour ?? (new Date().getHours() + new Date().getMinutes() / 60);

  useEffect(() => {
    if (overrideHour !== null) onChange(dateAtHour(overrideHour));
    // Run once on mount only — the slider's own onChange already
    // pushes updates while the user drags.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSlider(e: ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    setOverrideHour(v);
    onChange(dateAtHour(v));
  }

  function handleReset() {
    setOverrideHour(null);
    onChange(null);
  }

  return (
    <div
      title="Drag to override sun time. Double-click to snap back to real time."
      onDoubleClick={handleReset}
      style={{
        // Vertically centered to align with the right-side button stack,
        // sitting just to the left of the 30px-wide column (right: 12)
        // with an 8 px gap. Sun-icon button toggles the slider's
        // visibility so this only mounts when needed.
        position: "absolute",
        top: "50%",
        right: 50,
        transform: "translateY(-50%)",
        zIndex: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        background: "rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${overrideHour === null ? "rgba(200, 169, 110, 0.3)" : GOLD}`,
        borderRadius: 12,
        boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
        fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
        fontSize: 11,
        color: GOLD,
        letterSpacing: "0.04em",
        transition: "border-color 150ms ease, background 150ms ease",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
        {formatHour(displayHour)}
        {overrideHour !== null && (
          <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 4 }}>OVR</span>
        )}
      </span>
      <input
        type="range"
        min={0}
        max={24}
        step={0.25}
        value={displayHour}
        onChange={handleSlider}
        aria-label="Sun-time override"
        style={{
          width: 130,
          accentColor: GOLD,
          cursor: "pointer",
        }}
      />
    </div>
  );
}
