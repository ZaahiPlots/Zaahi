/**
 * Server-side valuation. Returns price in fils (BigInt).
 *
 * Formula: area_sqft × pricePerSqft × districtMultiplier
 *
 *   pricePerSqft: base rate per emirate (fils/sqft, integer)
 *   districtMultiplier: ×1.0 baseline, premium districts > 1
 *
 * Source: rough Dubai market averages 2025. Replace with live feed (DLD,
 * Property Finder API) once integrated. Keeping the table here is intentional —
 * one place to update, no random numbers.
 */

// fils per sqft. 1 AED = 100 fils. 1500 AED/sqft → 150000 fils/sqft.
const BASE_FILS_PER_SQFT: Record<string, number> = {
  Dubai: 150_000,
  'Abu Dhabi': 130_000,
  Sharjah: 70_000,
  Ajman: 50_000,
  'Ras Al Khaimah': 60_000,
  Fujairah: 45_000,
  'Umm Al Quwain': 40_000,
};

// Multipliers for premium districts. Anything not listed → 1.0.
const DISTRICT_MULTIPLIERS: Record<string, number> = {
  // Dubai
  'Palm Jumeirah': 3.2,
  'Downtown Dubai': 2.6,
  'Dubai Marina': 2.1,
  'Business Bay': 1.8,
  'Jumeirah Village Circle': 1.2,
  'Dubai Hills Estate': 2.0,
  'Emirates Hills': 3.0,
  'Al Barsha': 1.3,
  'Dubai Investments Park': 0.9,
  // Abu Dhabi
  'Saadiyat Island': 2.4,
  'Yas Island': 1.9,
  'Al Reem Island': 1.6,
};

const DEFAULT_FALLBACK_FILS_PER_SQFT = 60_000;

export interface ValuationInput {
  areaSqft: number;
  emirate: string;
  district: string;
}

export interface ValuationResult {
  valuationFils: bigint;
  pricePerSqftFils: number;
  districtMultiplier: number;
  basis: 'table' | 'fallback';
}

export function computeValuation({ areaSqft, emirate, district }: ValuationInput): ValuationResult {
  if (!Number.isFinite(areaSqft) || areaSqft <= 0) {
    throw new Error('areaSqft must be a positive number');
  }

  const base = BASE_FILS_PER_SQFT[emirate];
  const pricePerSqftFils = base ?? DEFAULT_FALLBACK_FILS_PER_SQFT;
  const districtMultiplier = DISTRICT_MULTIPLIERS[district] ?? 1.0;

  // Use Math.round on the float multiplication, then BigInt — fils are integers.
  const valuationFils = BigInt(Math.round(areaSqft * pricePerSqftFils * districtMultiplier));

  return {
    valuationFils,
    pricePerSqftFils,
    districtMultiplier,
    basis: base ? 'table' : 'fallback',
  };
}

export function filsToAed(fils: bigint): string {
  const aed = Number(fils) / 100;
  return aed.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 });
}
