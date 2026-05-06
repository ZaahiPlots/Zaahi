// ZAAHI Feasibility v6.0 — auto-generated optimization recommendations.
//
// Walks every input vs the engine baseline and emits one-line savings advice
// for each |Δ| ≥ 15 % deviation, tied to the AED magnitude of the gap.
// Conservative tone — flags opportunities, not prescriptions. Used in the
// Sprint 9d branded PDF cover page §5.
//
// Design per docs/specs/feasibility-v6/16_SPRINT_9_PROPOSAL.md §8.

import type { EngineDefaults } from './engines';

export interface RecommendationInput {
  // Engine defaults for comparison
  engine: EngineDefaults;
  // User-modified values
  constructionPsfBua: number;
  brandPsfBua: number;
  consultancyPsfBua: number;
  infrastructurePsfBua: number;
  contingencyPct: number;
  salesPsfSfa: number;
  monthlyRentPsfSfa: number;
  occupancyPct: number;
  operatingPct: number;
  // Volume basis for AED magnitudes
  buaSqft: number;
  sfaSqft: number;
  totalConstructionAed: number;
  grossRevenueAed: number;
  netAnnualAed: number;
  // Brokerage / marketing context for sales recommendations
  commissionPct: number;
  marketingPct: number;
}

export interface Recommendation {
  category: 'construction' | 'revenue' | 'finance' | 'sales' | 'rental';
  text: string;
  aedImpact: number;     // signed: positive = savings opportunity, negative = uplift opportunity
}

const DELTA_THRESHOLD_PCT = 15;

function pctDelta(current: number, baseline: number): number {
  if (baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

function absDelta(current: number, baseline: number): number {
  return Math.abs(current - baseline);
}

function fmtAed(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)} M`;
  if (Math.abs(n) >= 1_000) return `AED ${(n / 1_000).toFixed(0)} k`;
  return `AED ${Math.round(n).toLocaleString('en-US')}`;
}

export function generateRecommendations(inp: RecommendationInput): Recommendation[] {
  const out: Recommendation[] = [];

  // ── Construction recommendations ────────────────────────────────────
  if (inp.engine.constructionPsfBua > 0) {
    const delta = pctDelta(inp.constructionPsfBua, inp.engine.constructionPsfBua);
    if (Math.abs(delta) >= DELTA_THRESHOLD_PCT) {
      const aed = absDelta(inp.constructionPsfBua, inp.engine.constructionPsfBua) * inp.buaSqft;
      const sign = delta > 0 ? 'above' : 'below';
      const opportunity = delta > 0 ? 'savings' : 'cost-add risk';
      out.push({
        category: 'construction',
        text: `Construction psf ${delta > 0 ? '+' : ''}${delta.toFixed(0)}% ${sign} engine baseline (${inp.engine.source.split('·')[0].trim()}). ${
          delta > 0
            ? `Aligning to baseline would save ~${fmtAed(aed)}. Consider RICS NRM 1 unit-rate review with contractor.`
            : `Below baseline carries cost-add risk if scope creeps; lock specifications early.`
        }`,
        aedImpact: delta > 0 ? aed : -aed,
      });
    }
  }

  if (inp.contingencyPct > 5) {
    const delta = inp.contingencyPct - 5;
    if (delta >= 3) {
      // Contingency held above 5% spec → potential reserve release post-tender
      const aed = (delta / 100) * inp.totalConstructionAed;
      out.push({
        category: 'construction',
        text: `Contingency ${inp.contingencyPct}% is ${delta.toFixed(0)} pp above the 5% pre-tender RICS NRM 1 baseline. ~${fmtAed(aed)} reserve releasable post-tender; RICS NRM 1 recommends 5% pre-tender, 3% post-tender.`,
        aedImpact: aed,
      });
    }
  }

  if (inp.brandPsfBua > 50) {
    // Brand premium > 50 AED/sqft is significant
    const aed = inp.brandPsfBua * inp.buaSqft;
    out.push({
      category: 'construction',
      text: `Brand premium AED ${inp.brandPsfBua}/sqft adds ${fmtAed(aed)} to construction. Verify the brand partnership delivers measurable price uplift on sales psf to justify; otherwise consider unbranded delivery.`,
      aedImpact: aed,
    });
  }

  // ── Sales recommendations (BtS) ─────────────────────────────────────
  if (inp.engine.salesPsfSfa > 0 && inp.salesPsfSfa > 0) {
    const delta = pctDelta(inp.salesPsfSfa, inp.engine.salesPsfSfa);
    if (Math.abs(delta) >= DELTA_THRESHOLD_PCT) {
      const aed = absDelta(inp.salesPsfSfa, inp.engine.salesPsfSfa) * inp.sfaSqft;
      out.push({
        category: 'revenue',
        text: `Sales psf ${delta > 0 ? '+' : ''}${delta.toFixed(0)}% ${delta > 0 ? 'above' : 'below'} engine baseline (${inp.engine.source.split('·')[0].trim()}). ${
          delta > 0
            ? `${fmtAed(aed)} of upside locked in if achievable; verify against current DLD secondary comps.`
            : `${fmtAed(aed)} of revenue uplift achievable if pricing aligned to comp; consider commissioning a RERA-licensed valuer comp study.`
        }`,
        aedImpact: delta > 0 ? aed : -aed,
      });
    }
  }

  // Commission > 8.5% — Dubai broker norm is 2% per side, aggregator-led launches 6-10%.
  if (inp.commissionPct > 8.5) {
    const delta = inp.commissionPct - 8.5;
    const aed = (delta / 100) * inp.grossRevenueAed;
    out.push({
      category: 'sales',
      text: `Commission ${inp.commissionPct}% is ${delta.toFixed(1)} pp above the 8.5% Dubai blended-launch norm. ${fmtAed(aed)} potential saving if negotiated to mid-range; or split per-side at 2% buy / 2% sell + 4% marketing.`,
      aedImpact: aed,
    });
  }

  // Marketing > 3% — diminishing returns above this for boutique launches.
  if (inp.marketingPct > 3) {
    const delta = inp.marketingPct - 3;
    if (delta >= 1) {
      const aed = (delta / 100) * inp.grossRevenueAed;
      out.push({
        category: 'sales',
        text: `Marketing ${inp.marketingPct}% is ${delta.toFixed(1)} pp above the 3% boutique-launch typical. ${fmtAed(aed)} reallocatable to brokerage incentives or post-handover service if launch absorption is strong.`,
        aedImpact: aed,
      });
    }
  }

  // ── Rental recommendations (BtR) ────────────────────────────────────
  if (inp.engine.monthlyRentPsfSfa > 0 && inp.monthlyRentPsfSfa > 0) {
    const delta = pctDelta(inp.monthlyRentPsfSfa, inp.engine.monthlyRentPsfSfa);
    if (Math.abs(delta) >= DELTA_THRESHOLD_PCT) {
      // Annualised rent gap × SFA × 12 months
      const monthlyAedGap = absDelta(inp.monthlyRentPsfSfa, inp.engine.monthlyRentPsfSfa) * inp.sfaSqft;
      const annualGap = monthlyAedGap * 12;
      out.push({
        category: 'rental',
        text: `Rent psf ${delta > 0 ? '+' : ''}${delta.toFixed(0)}% ${delta > 0 ? 'above' : 'below'} engine baseline. Annual rent gap ${fmtAed(annualGap)} ${delta > 0 ? '— verify against active leases in district before assuming achievable' : '— pricing aligned to comp would lift NOI'}.`,
        aedImpact: delta > 0 ? annualGap : -annualGap,
      });
    }
  }

  if (inp.engine.occupancyPct > 0 && inp.occupancyPct > 0) {
    const delta = pctDelta(inp.occupancyPct, inp.engine.occupancyPct);
    if (delta < -10) {
      // Occupancy materially below baseline — potential leasing-strategy issue
      const annualGapPct = Math.abs(delta);
      const annualGap = (annualGapPct / 100) * inp.netAnnualAed;
      out.push({
        category: 'rental',
        text: `Occupancy ${inp.occupancyPct}% is ${annualGapPct.toFixed(0)} pp below engine baseline (${inp.engine.occupancyPct}%). Annual NOI gap ${fmtAed(annualGap)} — review leasing strategy, broker incentives, void marketing.`,
        aedImpact: annualGap,
      });
    }
  }

  if (inp.engine.operatingPct > 0 && inp.operatingPct > inp.engine.operatingPct + 5) {
    const delta = inp.operatingPct - inp.engine.operatingPct;
    const annualGap = (delta / 100) * inp.netAnnualAed;
    out.push({
      category: 'rental',
      text: `Operating ratio ${inp.operatingPct}% is ${delta.toFixed(0)} pp above engine baseline (${inp.engine.operatingPct}%). Annual savings opportunity ${fmtAed(Math.abs(annualGap))} via FM contract review or service-charge audit.`,
      aedImpact: Math.abs(annualGap),
    });
  }

  // Sort by absolute AED impact descending — most material recommendations first.
  out.sort((a, b) => Math.abs(b.aedImpact) - Math.abs(a.aedImpact));

  // Cap at 8 (the proposal said 3-8 lines on a typical parcel).
  return out.slice(0, 8);
}
