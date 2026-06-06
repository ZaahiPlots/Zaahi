// ZAAHI Feasibility v6.0 — IRR-primary verdict (developer language).
//
// Founder ratification 2026-06-06: developers and institutional reviewers
// speak in annualised IRR, not project-life ROI. v6 calculator surfaces an
// IRR-banded verdict as the headline and keeps the v5 ROI verdict alongside
// as a secondary read.
//
// Bands are calibrated to the Dubai 2026 development capital stack
// (developer construction loan @ ~7% + equity hurdle ~12%):
//   IRR ≥ 20% p.a.  → STRONG    (institutional-grade)
//   IRR ≥ 12%       → MODERATE  (above equity hurdle, deal-worthy)
//   IRR ≥ 0         → WEAK      (positive return, below typical hurdle)
//   IRR < 0 / NaN  → BELOW     (loss / no IRR found)
//
// BtR IRR bands run slightly lower because BtR includes both rental hold
// + exit value, lengthening the timeline.

export type VerdictTone = 'strong' | 'moderate' | 'weak' | 'below';

export interface IrrVerdict {
  tone: VerdictTone;
  label: string;
  color: string;
  threshold: string; // "≥ 20% p.a." etc., for tooltip
}

const GREEN = '#2D6A4F';
const GOLD = '#C8A96E';
const AMBER = '#E67E22';
const GRAY = '#888888';

export function btsIrrVerdict(irrPct: number): IrrVerdict {
  if (!Number.isFinite(irrPct)) {
    return {
      tone: 'below',
      label: 'No IRR (no sign change in cashflows)',
      color: GRAY,
      threshold: 'Cashflows must straddle zero',
    };
  }
  if (irrPct >= 20)
    return { tone: 'strong', label: 'Strong — institutional-grade', color: GREEN, threshold: '≥ 20% p.a.' };
  if (irrPct >= 12)
    return { tone: 'moderate', label: 'Moderate — above equity hurdle', color: GOLD, threshold: '≥ 12% p.a.' };
  if (irrPct >= 0)
    return { tone: 'weak', label: 'Weak — positive but below hurdle', color: AMBER, threshold: '≥ 0' };
  return { tone: 'below', label: 'Below — loss', color: GRAY, threshold: '< 0' };
}

export function btrIrrVerdict(irrPct: number): IrrVerdict {
  if (!Number.isFinite(irrPct)) {
    return {
      tone: 'below',
      label: 'No IRR (cashflows do not straddle zero)',
      color: GRAY,
      threshold: 'Cashflows must straddle zero',
    };
  }
  if (irrPct >= 15)
    return { tone: 'strong', label: 'Strong — institutional-grade', color: GREEN, threshold: '≥ 15% p.a.' };
  if (irrPct >= 9)
    return { tone: 'moderate', label: 'Moderate — above equity hurdle', color: GOLD, threshold: '≥ 9% p.a.' };
  if (irrPct >= 0)
    return { tone: 'weak', label: 'Weak — positive but below hurdle', color: AMBER, threshold: '≥ 0' };
  return { tone: 'below', label: 'Below — loss', color: GRAY, threshold: '< 0' };
}

export function jvProjectIrrVerdict(irrPct: number): IrrVerdict {
  return btsIrrVerdict(irrPct);
}
