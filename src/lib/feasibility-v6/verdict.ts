// ZAAHI Feasibility v6.1 — the verdict.
//
// ONE band system, driven by annualised IRR (founder ratification 2026-06-06,
// bands unchanged here). The audit found three sets of thresholds in play —
// the IRR bands in this file, the v5 ROI / yield bands shown as a "secondary
// read", and a third set printed in the PDF glossary (ROI 25% / yield 8%).
// Everything that states a band now reads it from `VERDICT_BANDS`.
//
// Two guards sit in front of the bands. They are what stops a hospital with
// no medical equipment reading "Strong — institutional-grade":
//
//   1. INDICATIVE — a revenue-critical input is still a placeholder (no
//      market data exists for it). The numbers are shown; the verdict is not.
//   2. CHECK INPUTS — the result is outside what any real development
//      returns. A band label on a 300% ROI is a claim the model cannot back.
//
// The plausibility ceilings are an assumption (FOUNDER DECISIONS, 2026-11-20).

export const STRONG_IRR_BTS = 20;
export const MODERATE_IRR_BTS = 12;
export const STRONG_IRR_BTR = 15;
export const MODERATE_IRR_BTR = 9;

/** Above these, the verdict is replaced by "check inputs". */
export const PLAUSIBLE_MAX = {
  btsIrrPct: 60,
  btsRoiPct: 100,
  btrIrrPct: 40,
  btrYieldPct: 15,
} as const;

export type VerdictTone = 'strong' | 'moderate' | 'weak' | 'below' | 'indicative' | 'check';

export interface Verdict {
  tone: VerdictTone;
  label: string;
  color: string;
  /** The band this result fell in, or why no band is given. */
  threshold: string;
  /** True when the label is a band (strong / moderate / weak / below). */
  banded: boolean;
}

const GREEN = '#2D6A4F';
const GOLD = '#C8A96E';
const AMBER = '#E67E22';
const SUBTLE = '#6B7280';

export const VERDICT_BANDS = {
  bts: [
    { tone: 'strong' as const, min: STRONG_IRR_BTS, label: 'Strong — institutional-grade' },
    { tone: 'moderate' as const, min: MODERATE_IRR_BTS, label: 'Moderate — above equity hurdle' },
    { tone: 'weak' as const, min: 0, label: 'Weak — positive but below hurdle' },
  ],
  btr: [
    { tone: 'strong' as const, min: STRONG_IRR_BTR, label: 'Strong — institutional-grade' },
    { tone: 'moderate' as const, min: MODERATE_IRR_BTR, label: 'Moderate — above equity hurdle' },
    { tone: 'weak' as const, min: 0, label: 'Weak — positive but below hurdle' },
  ],
};

/** Plain-English statement of the bands, for the PDF glossary and tooltips. */
export function verdictBandsText(): string {
  return (
    `Based on annualised IRR. Build to Sell / JV: Strong at ${STRONG_IRR_BTS}% or more, Moderate ${MODERATE_IRR_BTS}-${STRONG_IRR_BTS}%, ` +
    `Weak 0-${MODERATE_IRR_BTS}%, Below under 0%. Build to Rent: Strong at ${STRONG_IRR_BTR}% or more, Moderate ${MODERATE_IRR_BTR}-${STRONG_IRR_BTR}%, ` +
    `Weak 0-${MODERATE_IRR_BTR}%, Below under 0%. No band is given when a key input is a placeholder ("Indicative"), ` +
    `or when the result is outside a plausible range (IRR over ${PLAUSIBLE_MAX.btsIrrPct}% or ROI over ${PLAUSIBLE_MAX.btsRoiPct}% for a sale; ` +
    `IRR over ${PLAUSIBLE_MAX.btrIrrPct}% or yield over ${PLAUSIBLE_MAX.btrYieldPct}% for a hold).`
  );
}

export function verdictFor(a: {
  mode: 'bts' | 'btr';
  irrPct: number;
  roiPct: number;
  yieldPct: number;
  /** Labels of placeholder inputs still at their default. */
  unverified: string[];
  /** Modelled on a change of use that has not been granted. */
  hypothetical: boolean;
}): Verdict {
  if (a.unverified.length > 0) {
    return {
      tone: 'indicative',
      label: 'Indicative only — placeholder inputs',
      color: AMBER,
      threshold: `No market data for: ${a.unverified.join(', ')}. Enter your own figures to get a verdict.`,
      banded: false,
    };
  }
  const implausible =
    a.mode === 'bts'
      ? a.irrPct > PLAUSIBLE_MAX.btsIrrPct || a.roiPct > PLAUSIBLE_MAX.btsRoiPct
      : a.irrPct > PLAUSIBLE_MAX.btrIrrPct || a.yieldPct > PLAUSIBLE_MAX.btrYieldPct;
  if (implausible) {
    return {
      tone: 'check',
      label: 'Outside plausible range — check inputs',
      color: AMBER,
      threshold: 'Returns this high almost always mean a cost is missing or a revenue input is wrong.',
      banded: false,
    };
  }
  const prefix = a.hypothetical ? 'Hypothetical · ' : '';
  if (!Number.isFinite(a.irrPct)) {
    return { tone: 'below', label: `${prefix}Below — capital is not recovered`, color: SUBTLE, threshold: 'No IRR: the cashflows never turn positive', banded: true };
  }
  for (const band of VERDICT_BANDS[a.mode]) {
    if (a.irrPct >= band.min) {
      return {
        tone: band.tone,
        label: `${prefix}${band.label}`,
        color: band.tone === 'strong' ? GREEN : band.tone === 'moderate' ? GOLD : AMBER,
        threshold: `IRR ≥ ${band.min}% p.a.`,
        banded: true,
      };
    }
  }
  return { tone: 'below', label: `${prefix}Below — loss`, color: SUBTLE, threshold: 'IRR < 0', banded: true };
}
