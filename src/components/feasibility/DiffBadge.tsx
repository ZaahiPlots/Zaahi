'use client';

// ZAAHI Feasibility v6 — live diff pill button.
//
// Renders a 4-tone deviation badge (green/amber/amber-bold/red) based on
// `diffTone(current, baseline)`. Click resets the field to its engine default
// — wired via `onReset`. Suppressed when baseline ≤ 0 (engines whose revenue
// is not psf-driven, e.g. Hospitality ADR, Healthcare per-bed).

import { diffTone } from '@/lib/feasibility-v6/diffBadge';

export interface DiffBadgeProps {
  current: number;
  baseline: number;
  onReset?: () => void;
}

export default function DiffBadge({ current, baseline, onReset }: DiffBadgeProps) {
  if (baseline <= 0 || !Number.isFinite(baseline)) return null;
  const d = diffTone(current, baseline);
  const sign = d.pct > 0 ? '+' : '';
  return (
    <button
      type="button"
      onClick={onReset}
      title={`${d.label} (click to reset)`}
      style={{
        background: 'transparent',
        border: `1px solid ${d.color}`,
        color: d.color,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.04em',
        padding: '1px 6px',
        borderRadius: 999,
        cursor: onReset ? 'pointer' : 'default',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {sign}
      {d.pct.toFixed(0)}%
    </button>
  );
}
