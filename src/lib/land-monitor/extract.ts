import type { ExtractedFields } from "./types";
import { allCanonicalCommunities, canonicaliseCommunity } from "./communities";

// Build a composite regex of all canonical community aliases for a cheap
// scan of raw text when the LLM is unreachable or skipped. Pre-built at
// module load so the per-post cost is a single regex match.
const COMMUNITY_SCAN_RX = new RegExp(
  allCanonicalCommunities()
    .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "i",
);

// Claude Haiku 4.5 extraction. One post in → one JSON out (or null).
// We run a regex prepass first: if a 7-digit plot number and a canonical
// community and a price are all present in the raw text, we skip the LLM
// (cost + latency win, and avoids sending LLM-unfriendly inputs).
//
// Pricing reference (Spec 09 §3.2): Haiku 4.5 $1/$5 per 1M tokens. Budget at
// 1 req ≈ 1k in / 300 out ≈ $0.0025/post with cache. 500 posts ≈ $1.25.

const MODEL_ID = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

const RX_PLOT_7 = /\b\d{7}\b/;
const RX_PLOT_9 = /\b\d{9}\b/;
const RX_PRICE = /(?:AED|Dhs?)[\s.]*([\d,.]+)(?:\s*(M|Million|K|Thousand))?/i;
const RX_AREA = /([\d,.]+)\s*(?:sq\.?\s*ft|sqft|sq\.?\s*m|sqm)\b/i;
const RX_PHONE = /(?:\+?971|0)\s*5\d[\s-]?\d{3}[\s-]?\d{4}/;

function parsePrice(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(RX_PRICE);
  if (!m) return null;
  const num = parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  const unit = m[2]?.toLowerCase() ?? "";
  if (unit.startsWith("m")) return Math.round(num * 1_000_000);
  if (unit.startsWith("k") || unit.startsWith("t")) return Math.round(num * 1_000);
  return Math.round(num);
}

function parseArea(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(RX_AREA);
  if (!m) return null;
  const num = parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  const isSqm = /sqm|sq\.?\s*m/i.test(m[0]);
  return Math.round(isSqm ? num * 10.7639 : num);
}

/**
 * Keyword gate — returns true if the text plausibly references a land/plot
 * sale. Saves an LLM call on the 90 % of r/dubai posts that are about
 * visas, restaurants, traffic, etc.
 */
export function looksLikeLandPost(text: string): boolean {
  const t = text.toLowerCase();
  if (/\bplot\b|\bparcel\b|\bland\s+for\s+sale\b|\bfreehold\s+land\b|\bg\+\d+\b/i.test(t))
    return true;
  if (/\bdda\b/i.test(t) && /\b(sale|price|aed|sqft)\b/i.test(t)) return true;
  if (RX_PLOT_7.test(t) && /\b(aed|dhs|dhs?)\b/i.test(t)) return true;
  return false;
}

/**
 * Cheap deterministic first pass. Returns a partial record; the LLM then
 * fills in broker / community / transaction_type when those aren't
 * regex-trivial. If we already have a plot number + price + area, skip LLM.
 */
export function regexExtract(text: string): ExtractedFields {
  const plotNumber =
    text.match(RX_PLOT_7)?.[0] ?? text.match(RX_PLOT_9)?.[0] ?? null;
  const priceRaw = text.match(RX_PRICE)?.[0] ?? null;
  const areaRaw = text.match(RX_AREA)?.[0] ?? null;
  const phone = text.match(RX_PHONE)?.[0] ?? null;
  // Community scan over raw text — catches "Business Bay", "JVC", "Downtown"
  // etc. even when the LLM is skipped or unreachable. Cheap enough to always
  // run: a single regex match against a precompiled alternation.
  const communityHit = text.match(COMMUNITY_SCAN_RX)?.[0] ?? null;
  const community = canonicaliseCommunity(communityHit);
  const transactionType = /\bfor\s+sale|selling|resale\b/i.test(text)
    ? ("sale" as const)
    : /\bfor\s+rent|to\s+let|rental\b/i.test(text)
      ? ("rent" as const)
      : null;
  // Confidence: plot number alone = 0.6, community alone = 0.45, both = 0.75.
  const hasSignal = !!plotNumber || !!community;
  const base = plotNumber && community ? 0.75 : plotNumber ? 0.6 : community ? 0.45 : 0.3;
  return {
    plotNumber,
    community,
    priceAed: parsePrice(priceRaw),
    areaSqft: parseArea(areaRaw),
    transactionType,
    brokerName: null,
    brokerPhone: phone,
    confidence: hasSignal ? base : 0.3,
  };
}

const SYSTEM = `You extract structured UAE land/plot-sale data from free-text social posts.
Return ONLY valid JSON with this exact shape:
{"plot_number": string|null, "community": string|null, "price_aed": number|null,
 "area_sqft": number|null, "transaction_type": "sale"|"rent"|null,
 "broker_name": string|null, "is_land_plot": boolean, "confidence": number}
Rules:
- "is_land_plot": true only if the post is about buying/selling/renting an actual LAND plot (not a villa, apartment, or office unit).
- "plot_number": UAE/DLD plot numbers are 7 or 9 digits. Return only digits.
- "community": use the most common English name (e.g. "Jumeirah Village Circle", not "JVC"). Null if not mentioned.
- "price_aed": integer in AED. Convert M → ×1_000_000 and K → ×1_000.
- "area_sqft": integer in square feet. Convert sqm → ×10.7639.
- "confidence": 0.0–1.0; your honest confidence the extraction is correct.
- NEVER fabricate. If a field is not in the text, return null.
Return JSON only — no code fences, no commentary.`;

function stripCodeFence(s: string): string {
  return s
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

export async function llmExtract(
  rawText: string,
  apiKey: string,
): Promise<ExtractedFields | null> {
  const trimmed = rawText.slice(0, 4000); // cap input — Reddit posts can be long
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL_ID,
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: "user", content: trimmed }],
    }),
  });
  if (!r.ok) {
    console.error("[land-monitor:extract] anthropic error", r.status, await r.text());
    return null;
  }
  const data = (await r.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const raw = data.content?.find((c) => c.type === "text")?.text ?? "";
  if (!raw) return null;
  let parsed: {
    plot_number?: string | null;
    community?: string | null;
    price_aed?: number | null;
    area_sqft?: number | null;
    transaction_type?: "sale" | "rent" | null;
    broker_name?: string | null;
    is_land_plot?: boolean;
    confidence?: number;
  };
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    console.error("[land-monitor:extract] non-json response", raw);
    return null;
  }
  if (parsed.is_land_plot === false) return null;

  const regex = regexExtract(trimmed);

  return {
    plotNumber:
      (parsed.plot_number ? parsed.plot_number.replace(/\D+/g, "") : null) ||
      regex.plotNumber,
    community:
      canonicaliseCommunity(parsed.community ?? null) ??
      (parsed.community ?? null),
    priceAed: parsed.price_aed ?? regex.priceAed,
    areaSqft: parsed.area_sqft ?? regex.areaSqft,
    transactionType: parsed.transaction_type ?? null,
    brokerName: parsed.broker_name ?? null,
    brokerPhone: regex.brokerPhone, // phone comes from regex only — we don't ask the LLM to infer it
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
  };
}
