// Pure helpers for scripts/build-sold-plots.ts (kept apart so the tests can import them).

export const norm = (s: string | null | undefined): string =>
  (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

// DXB "location" is "<project>, <DLD area>" or just "<DLD area>"; the DLD area is the last segment.
// A location cut off by the PDF ("… Wadi …") has no reliable area.
export function dxbArea(loc: string, truncated: number | null): string | null {
  if (!loc || /…|\.\.\.$/.test(loc)) return null;
  const seg = loc.split(',').pop()!.trim();
  if (truncated && !loc.includes(',')) return null;
  return seg || null;
}

export type ProcClass = 'sale' | 'mortgage' | 'gift' | null;

// D1(a): DLD group 1 Sales. "Complete Delayed Sell" completes an earlier Delayed Sell (not a new sale)
// and is not in DLD group 1, so it is left out to avoid double counting.
const SALE = new Set(['sale', 'delayed sell', 'lease to own registration', 'sell - pre registration']);
const GIFT = new Set(['grant', 'grant on delayed sell', 'bestowal']);
export function classifyProc(p: string | null | undefined): ProcClass {
  const n = norm(p);
  if (SALE.has(n)) return 'sale';
  if (n.includes('mortgage')) return 'mortgage';
  if (GIFT.has(n)) return 'gift';
  return null;
}

export const SQM_TO_SQFT = 10.763910417;
export const fils = (aed: number): number => Math.round(aed * 100);

export const month = (d: string | null | undefined): string | null =>
  d && /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : null;

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}
export function pctl(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
}

// Keys that must never reach data/sold-plots/ (spec §10 PII guard).
export const PII_KEY = /name|mobile|phone|emirates|email/i;
export function findPiiKeys(v: unknown, path = ''): string[] {
  const hits: string[] = [];
  if (Array.isArray(v)) v.forEach((x, i) => hits.push(...findPiiKeys(x, `${path}[${i}]`)));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) {
      if (PII_KEY.test(k)) hits.push(`${path}.${k}`);
      hits.push(...findPiiKeys(x, `${path}.${k}`));
    }
  return hits;
}
