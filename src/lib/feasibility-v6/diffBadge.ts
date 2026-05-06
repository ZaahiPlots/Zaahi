// ZAAHI Feasibility v6.0 — diff-badge tone function.
//
// 4-tone deviation calculator per docs/specs/feasibility-v6/03_UX_FULLSCREEN_AND_DIFF.md.
// Used by <DiffBadge> component to colour-code "current vs engine default" deltas.
//
// Thresholds:
//   |Δ| ≤ 15%   green     #2D6A4F  on baseline
//   15 < |Δ| ≤ 30  amber     #E67E22  modest delta
//   30 < |Δ| ≤ 50  amberBold #D35400  large delta — closer look
//        |Δ| > 50  red       #E63946  extreme delta — review
//
// Engines whose revenue is not psf-driven (Hospitality ADR, Healthcare per-bed,
// Educational per-student, Data Center per-MW) carry baseline = 0 — the function
// returns a neutral "no baseline" green so the UI can suppress the badge.

export type DiffTone = 'green' | 'amber' | 'amberBold' | 'red';

export interface DiffResult {
  tone: DiffTone;
  pct: number;
  color: string;
  label: string;
}

export function diffTone(currentValue: number, defaultValue: number): DiffResult {
  if (defaultValue === 0) {
    return { tone: 'green', pct: 0, color: '#2D6A4F', label: 'no baseline' };
  }
  const pct = ((currentValue - defaultValue) / defaultValue) * 100;
  const abs = Math.abs(pct);
  if (abs <= 15) return { tone: 'green', pct, color: '#2D6A4F', label: 'on baseline' };
  if (abs <= 30) return { tone: 'amber', pct, color: '#E67E22', label: 'modest delta' };
  if (abs <= 50) return { tone: 'amberBold', pct, color: '#D35400', label: 'large delta' };
  return { tone: 'red', pct, color: '#E63946', label: 'extreme delta — review' };
}
