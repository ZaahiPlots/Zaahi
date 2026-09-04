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

// Founder backlog #7 — "area 1:1 with the source, no rounding".
//
// Areas used to be rendered with Math.round(), so a 2,426.5 sqm plot read as
// "2,427 m²" and the half metre vanished. The first attempt at this (on
// feat/backlog-batch-2, 2026-06-12) swung the other way: it formatted every
// area with maximumFractionDigits: 20, which does not show source precision —
// it shows IEEE-754 noise. Measured on the real conversion path:
//
//     4,500 sqm  ->  "48,437.596875195006 sqft"
//     2,426 sqm  ->  "26,113.24667093846 sqft"
//
// Neither figure is a fact about the plot. Twelve of those digits are an
// artefact of multiplying by a float.
//
// So the rule is now split by provenance, per founder decision 2026-09-04:
//
//   SOURCE value    — the number the DDA / database actually gave us for the
//                     unit being displayed. Rendered untouched: every decimal
//                     it carries, none invented. `String(n)` is JavaScript's
//                     shortest round-trip representation, so counting its
//                     decimals can neither add nor drop precision.
//
//   CONVERTED value — derived here by multiplying or dividing by
//                     SQFT_PER_SQM. Capped at 2 decimals, because beyond that
//                     the digits describe the conversion constant, not the
//                     land.
const CONVERTED_MAX_DECIMALS = 2;

/**
 * Decimal places actually present in a number's shortest round-trip form.
 * Used so a source value is never padded and never truncated.
 */
function sourceDecimals(n: number): number {
  const s = String(n);
  // Exponential form (1e-7, 1.5e+21) carries no plain decimal tail to count.
  if (s.includes("e") || s.includes("E")) return 0;
  const dot = s.indexOf(".");
  if (dot < 0) return 0;
  // Intl caps maximumFractionDigits at 20; String() cannot exceed it either,
  // but clamp rather than trust that.
  return Math.min(s.length - dot - 1, 20);
}

/** Source value: grouped, with exactly the precision the source carried. */
function fmtSourceArea(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: sourceDecimals(n),
  });
}

/** Converted value: grouped, capped so float noise cannot reach the screen. */
function fmtConvertedArea(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: CONVERTED_MAX_DECIMALS,
  });
}

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
export function formatArea(
  sqftValue: number | null | undefined,
  sqmValue: number | null | undefined,
  unit: AreaUnit,
): string | null {
  // Prefer the source value for the requested unit; convert only as a
  // fallback. The preference order is unchanged — what changed is that the
  // two paths now format differently, because only one of them is a
  // measurement (backlog #7).
  if (unit === "sqm") {
    if (typeof sqmValue === "number" && Number.isFinite(sqmValue)) {
      return `${fmtSourceArea(sqmValue)} m²`;
    }
    if (typeof sqftValue === "number" && Number.isFinite(sqftValue)) {
      return `${fmtConvertedArea(sqftValue / SQFT_PER_SQM)} m²`;
    }
    return null;
  }
  if (typeof sqftValue === "number" && Number.isFinite(sqftValue)) {
    return `${fmtSourceArea(sqftValue)} sqft`;
  }
  if (typeof sqmValue === "number" && Number.isFinite(sqmValue)) {
    return `${fmtConvertedArea(sqmValue * SQFT_PER_SQM)} sqft`;
  }
  return null;
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
