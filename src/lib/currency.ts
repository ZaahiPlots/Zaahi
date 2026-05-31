"use client";

// User preference for displaying prices — AED (Dubai market default)
// or USD (international). Persisted in localStorage AND mirrored to
// the User.currency Prisma column via /api/me PATCH (founder spec
// 2026-05-31, "variant B sync") so a fresh login on another device
// can hydrate from the DB.
//
// All internal storage / API values are always in AED (per CLAUDE.md
// "currentValuation BigInt? // fils"). The currency only affects
// DISPLAY.
//
// ⚠ AED is hard-pegged to USD at 1 USD = 3.6725 AED — UAE Central
// Bank, since 1997. The dirham does not float. A fixed constant is
// the correct rate; an external rate API is NOT needed.

import { useCallback, useEffect, useState } from "react";

export type Currency = "AED" | "USD";

export const DEFAULT_CURRENCY: Currency = "AED";

/** UAE Central Bank fixed peg, in place since 1997. 1 USD = 3.6725 AED. */
export const AED_PER_USD = 3.6725;
/** Inverse — 1 AED ≈ 0.272257 USD. */
export const USD_PER_AED = 1 / AED_PER_USD;

const STORAGE_KEY = "zaahi-currency";
const CHANGE_EVENT = "zaahi-currency-changed";

/** Read current currency from localStorage. Safe in SSR (returns default). */
export function loadCurrency(): Currency {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "USD" ? "USD" : "AED";
  } catch {
    return DEFAULT_CURRENCY;
  }
}

/** Write currency to localStorage + broadcast within-tab so live hooks update. */
export function saveCurrency(currency: Currency): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, currency);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: currency }));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Subscribe to current currency. Re-renders the consuming component
 * when the user flips the toggle in /dashboard Settings (same tab —
 * via CustomEvent) or in another tab (via storage event).
 */
export function useCurrency(): Currency {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  useEffect(() => {
    setCurrency(loadCurrency());
    function onChange(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail === "AED" || detail === "USD") setCurrency(detail);
    }
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue === "AED" || e.newValue === "USD") setCurrency(e.newValue);
    }
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return currency;
}

/**
 * Format a numeric AED amount for display in the chosen currency.
 *   aed:      the stored value (always AED, per data model).
 *   currency: caller's chosen currency (usually from useCurrency).
 *
 * AED → "X AED" with thousands separator (e.g. "300,000,000 AED").
 * USD → "$X" with thousands separator (e.g. "$81,690,000"). $ prefix
 * matches the US convention founder picked in spec 2026-05-31.
 *
 * Returns null when the input is null / NaN.
 */
export function formatPrice(
  aed: number | null | undefined,
  currency: Currency,
): string | null {
  if (aed == null || !Number.isFinite(aed)) return null;
  if (currency === "USD") {
    const usd = aed * USD_PER_AED;
    return `$${Math.round(usd).toLocaleString()}`;
  }
  return `${Math.round(aed).toLocaleString()} AED`;
}

/**
 * Compact format for hover cards / nav rows where the headline number
 * matters more than the exact digits. Mirrors fmtBigAed's M/K bucketing
 * but in the chosen currency:
 *   AED: 300,000,000 → "300M AED"; 1,500 → "2K AED"; 950 → "950 AED"
 *   USD: $81,690,000 → "$82M";     $410   → "$410"
 *
 * Rounded values use Math.round at the bucket level (1 decimal for
 * sub-10 M figures, 0 decimals for the rest) so a 300M AED listing
 * doesn't show as "82.0M USD" — it shows "$82M".
 */
export function formatPriceShort(
  aed: number | null | undefined,
  currency: Currency,
): string | null {
  if (aed == null || !Number.isFinite(aed)) return null;
  const v = currency === "USD" ? aed * USD_PER_AED : aed;
  const prefix = currency === "USD" ? "$" : "";
  const suffix = currency === "USD" ? "" : " AED";
  if (v >= 1_000_000) {
    const millions = v / 1_000_000;
    const text = millions >= 10 ? millions.toFixed(0) : millions.toFixed(1);
    return `${prefix}${text}M${suffix}`;
  }
  if (v >= 1_000) {
    return `${prefix}${(v / 1_000).toFixed(0)}K${suffix}`;
  }
  return `${prefix}${Math.round(v)}${suffix}`;
}

/**
 * Convenience hook — subscribes to the user's chosen currency and
 * returns a memoised formatter. Saves callsites from importing the
 * raw currency + formatPrice.
 *
 *   const fmtP = useFormatPrice();
 *   …
 *   <span>{fmtP(plot.priceAed) ?? "—"}</span>
 */
export function useFormatPrice(): (
  aed: number | null | undefined,
) => string | null {
  const currency = useCurrency();
  return useCallback(
    (aed) => formatPrice(aed, currency),
    [currency],
  );
}

/** Compact-format variant of useFormatPrice. */
export function useFormatPriceShort(): (
  aed: number | null | undefined,
) => string | null {
  const currency = useCurrency();
  return useCallback(
    (aed) => formatPriceShort(aed, currency),
    [currency],
  );
}
