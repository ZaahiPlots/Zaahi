"use client";

// User preference for displaying plot area — sqft (Dubai market default)
// or m² (rest of world). Persisted in localStorage. Components read via
// `useAreaUnit()` which subscribes to a custom event so the toggle in
// /dashboard Settings updates open side-panels live without reload.
//
// All internal storage / API values are always in SQFT (per CLAUDE.md
// "area: Float // sqft" on Parcel). The unit only affects DISPLAY.

import { useCallback, useEffect, useState } from "react";

export type AreaUnit = "sqft" | "sqm";

export const DEFAULT_AREA_UNIT: AreaUnit = "sqft";

const STORAGE_KEY = "zaahi-area-unit";
const CHANGE_EVENT = "zaahi-area-unit-changed";

const SQFT_PER_SQM = 10.7639;

/** Read current unit from localStorage. Safe in SSR (returns default). */
export function loadAreaUnit(): AreaUnit {
  if (typeof window === "undefined") return DEFAULT_AREA_UNIT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "sqm" ? "sqm" : "sqft";
  } catch {
    return DEFAULT_AREA_UNIT;
  }
}

/** Write unit to localStorage + broadcast within-tab so live hooks update. */
export function saveAreaUnit(unit: AreaUnit): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, unit);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: unit }));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Subscribe to current area unit. Re-renders the consuming component when
 * the user flips the toggle in /dashboard Settings (same tab — via
 * CustomEvent) or in another tab (via storage event).
 */
export function useAreaUnit(): AreaUnit {
  const [unit, setUnit] = useState<AreaUnit>(DEFAULT_AREA_UNIT);
  useEffect(() => {
    setUnit(loadAreaUnit());
    function onChange(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail === "sqft" || detail === "sqm") setUnit(detail);
    }
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue === "sqft" || e.newValue === "sqm") setUnit(e.newValue);
    }
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return unit;
}

/**
 * Format a numeric area for display.
 *   sqftValue:  the stored value (always sqft, per data model).
 *   sqmValue:   optional pre-computed sqm (saves repeated division when
 *               the source carries both, e.g. AffectionPlan).
 *   unit:       caller's chosen unit (usually from useAreaUnit).
 *
 * Returns a localized string with thousands separators + unit suffix,
 * or null when both inputs are null.
 */
/**
 * Render a numeric area 1:1 with the source value — no rounding.
 *
 * Founder backlog #7 (2026-06-12): `Math.round` was discarding the 0.01
 * sqft precision that DDA returns. The fix preserves the source value
 * exactly and only adds a thousands separator for readability. If the
 * source has decimals they pass through verbatim (e.g. "47,250.83 sqft");
 * whole-number sources stay whole.
 *
 * Locale formatting: `Number.toLocaleString("en-US", { maximumFractionDigits: 20 })`
 * uses commas for thousands and preserves up to 20 fractional digits, which
 * covers anything the area pipeline can realistically carry.
 */
function formatSourcePrecise(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 20 });
}

export function formatArea(
  sqftValue: number | null | undefined,
  sqmValue: number | null | undefined,
  unit: AreaUnit,
): string | null {
  if (unit === "sqm") {
    const sqm = sqmValue ?? (typeof sqftValue === "number" ? sqftValue / SQFT_PER_SQM : null);
    if (sqm == null || !Number.isFinite(sqm)) return null;
    return `${formatSourcePrecise(sqm)} m²`;
  }
  const sqft = sqftValue ?? (typeof sqmValue === "number" ? sqmValue * SQFT_PER_SQM : null);
  if (sqft == null || !Number.isFinite(sqft)) return null;
  return `${formatSourcePrecise(sqft)} sqft`;
}

/**
 * Convenience hook — subscribes to the user's chosen area unit and
 * returns a memoised formatter. Saves callsites from importing the
 * raw `unit` + `formatArea` and threading both into JSX.
 *
 *   const fmtArea = useFormatArea();
 *   …
 *   <Row label="Plot Area" v={fmtArea(plot.sqft, plot.sqm)} />
 *
 * The returned callback re-creates only when the unit changes, so
 * React.memo'd children downstream are stable across unrelated
 * renders.
 */
export function useFormatArea(): (
  sqftValue: number | null | undefined,
  sqmValue: number | null | undefined,
) => string | null {
  const unit = useAreaUnit();
  return useCallback(
    (sqftValue, sqmValue) => formatArea(sqftValue, sqmValue, unit),
    [unit],
  );
}

/**
 * Format both units in one row — e.g. "33,862 sqft (3,146 m²)". Useful
 * for the rich side panel where founder wants both values visible side
 * by side regardless of the user's preferred unit toggle. The unit
 * argument controls which value comes first.
 */
export function formatAreaWithBoth(
  sqftValue: number | null | undefined,
  sqmValue: number | null | undefined,
  unit: AreaUnit,
): string | null {
  const primary = formatArea(sqftValue, sqmValue, unit);
  if (primary == null) return null;
  const secondary = formatArea(sqftValue, sqmValue, unit === "sqft" ? "sqm" : "sqft");
  return secondary ? `${primary} (${secondary})` : primary;
}
