/**
 * Plain-language rewriter for DDA "General Notes" on affection plans.
 *
 * The DDA / Dubai Land Department writes affection-plan notes in
 * developer / surveyor jargon. Buyers — the people who actually open
 * a parcel card on ZAAHI — are not developers. The rewriter expands
 * abbreviations and replaces jargon with plain English while
 * preserving the original meaning verbatim.
 *
 * Rules:
 *   1. Never invent facts. The rewriter only expands and rephrases.
 *      A pattern that doesn't match is left alone, never deleted.
 *   2. Never touch the database. The DB still stores the raw DDA
 *      string in `affectionPlan.notes`. The rewriter runs in the API
 *      response only — `/api/parcels/[id]` returns BOTH `notes`
 *      (rewritten) and `notesOriginal` (raw) so the side panel can
 *      show the friendly version with a "show original" link if you
 *      ever want one.
 *   3. Pure and deterministic. Same input → same output. No LLM call.
 *
 * Example (from CLAUDE.md):
 *   in:  "Plot is subject to 6m setback from ROW and 3m from adjacent
 *         plots. FAR 1.8 applicable."
 *   out: "Building must be set back 6 meters from the road and 3
 *         meters from neighboring plots. The total floor area can be
 *         up to 1.8 times the plot size."
 *
 * Source-of-truth in CLAUDE.md "Правила добавления участков" (the
 * "General Notes" section).
 */

interface Replacement {
  // A regex with capture groups OR a literal string.
  pattern: RegExp | string;
  // The replacement string (or function for complex transforms).
  replacement: string | ((m: RegExpMatchArray) => string);
}

// PHASE 1 — phrase-level rewrites. These run first because they capture
// multi-word DDA boilerplate as a unit and produce idiomatic English.
// Each rule must keep the underlying meaning intact.
const PHRASE_REPLACEMENTS: Replacement[] = [
  // "Plot is subject to Xm setback from ROW" → full canonical sentence
  // (this is the example from CLAUDE.md, line for line)
  {
    pattern: /\b(?:plot\s+is\s+)?subject\s+to\s+(\d+(?:\.\d+)?)\s*m\s+set\s*backs?\s+from\s+(?:the\s+)?(?:R\.?O\.?W\.?|ROW)(?:\s+and\s+(\d+(?:\.\d+)?)\s*m\s+from\s+adjacent\s+plots?)?/gi,
    replacement: (m) => {
      const fromRow = m[1];
      const fromAdj = m[2];
      const tail = fromAdj
        ? ` and ${fromAdj} meters from neighboring plots`
        : "";
      return `Building must be set back ${fromRow} meters from the road${tail}`;
    },
  },

  // "X shall be in accordance with FAR Y" / "X must be in accordance
  // with FAR Y" — canonical full-sentence rewrite. Run BEFORE the
  // generic FAR rule below so the verb prefix gets consumed.
  {
    pattern: /\b\w+\s+(?:shall|must)\s+(?:be\s+)?(?:in\s+accordance\s+with|pursuant\s+to)\s+(?:a\s+)?FAR\s+(?:of\s+)?(\d+(?:\.\d+)?)\b/gi,
    replacement: (m) =>
      `the total floor area can be up to ${m[1]} times the plot size`,
  },

  // "FAR X.X applicable" / "FAR X.X is applicable" / "FAR of X.X" /
  // "in accordance with FAR X.X" — collapses the entire phrase to one
  // canonical sentence about total floor area.
  {
    pattern: /\b(?:in\s+accordance\s+with\s+|pursuant\s+to\s+)?(?:a\s+)?FAR\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:is\s+)?(?:applicable|applies|allowed|permitted)?\b/gi,
    replacement: (m) =>
      `the total floor area can be up to ${m[1]} times the plot size`,
  },

  // "NOC required prior to commencement" → plain English. We use the
  // already-expanded form so the term-pass NOC rule (later) doesn't
  // double-expand.
  {
    pattern: /\bNOC\s+(?:is\s+)?required\s+prior\s+to\s+commencement\b/gi,
    replacement: "needs a no-objection certificate before construction starts",
  },

  // "shall be in accordance with" / "in accordance with" / "pursuant to"
  // — collapse before the FAR rule fires so we get one clean sentence
  // instead of "...shall be the total floor area can be up to...".
  // Order matters: the FAR phrase rule consumes the rest of the
  // sentence next.
  { pattern: /\bshall\s+be\s+in\s+accordance\s+with\b/gi, replacement: "follows" },
  { pattern: /\bin\s+accordance\s+with\b/gi, replacement: "according to" },
  { pattern: /\bpursuant\s+to\b/gi, replacement: "according to" },
];

// PHASE 2 — term-by-term abbreviation + glossary expansion. Run AFTER
// phrase replacement so phrase patterns can still see the abbreviations.
const TERM_REPLACEMENTS: Replacement[] = [
  // Glossary expansions (most specific first)
  { pattern: /\bR\.O\.W\.?/g, replacement: "the road" },
  { pattern: /\bROW\b/g, replacement: "the road" },
  { pattern: /\bGFA\b/g, replacement: "total floor area (GFA)" },
  { pattern: /\bBUA\b/g, replacement: "built-up area (BUA)" },
  { pattern: /\bDLD\b/g, replacement: "Dubai Land Department" },
  { pattern: /\bDDA\b/g, replacement: "Dubai Development Authority" },
  { pattern: /\bRERA\b/g, replacement: "RERA (the real-estate regulator)" },
  { pattern: /\bNOC\b/g, replacement: "no-objection certificate (NOC)" },
  { pattern: /\bBUL\b/g, replacement: "building-use limit" },
  { pattern: /\bMOU\b/g, replacement: "memorandum of understanding (MOU)" },
  { pattern: /\bSPA\b/g, replacement: "sale & purchase agreement (SPA)" },
  { pattern: /\bOqood\b/gi, replacement: "Oqood (off-plan registration)" },
  { pattern: /\bEjari\b/gi, replacement: "Ejari (rental registration)" },
  { pattern: /\bFAR\b/g, replacement: "floor-area ratio (FAR)" },

  // Unit expansions
  { pattern: /\bsq\.?\s*m\.?\b/gi, replacement: "square meters" },
  { pattern: /\bsqm\b/gi, replacement: "square meters" },
  { pattern: /\bsq\.?\s*ft\.?\b/gi, replacement: "square feet" },
  { pattern: /\bsqft\b/gi, replacement: "square feet" },

  // Height codes — "G+15" → "16 floors total (ground floor + 15 above)"
  {
    pattern: /\bP\s*\+\s*G\s*\+\s*(\d+)\b/g,
    replacement: (m) => {
      const upper = parseInt(m[1], 10);
      return `${upper + 2} floors total (parking + ground + ${upper} above)`;
    },
  },
  {
    pattern: /\bG\s*\+\s*(\d+)\b/g,
    replacement: (m) => {
      const upper = parseInt(m[1], 10);
      return `${upper + 1} floors total (ground floor + ${upper} above)`;
    },
  },

  // "6m" / "6 m" → "6 meters" — but only as a measurement (not as
  // part of a height code, which we already replaced).
  {
    pattern: /\b(\d+(?:\.\d+)?)\s*m(?![a-z²])/gi,
    replacement: (m) => `${m[1]} meters`,
  },

  // Standalone term rephrasings — only apply when they don't change
  // the sentence structure.
  { pattern: /\bsetbacks?\b/gi, replacement: "set back" },
  { pattern: /\badjacent\s+plots?\b/gi, replacement: "neighboring plots" },
  { pattern: /\badjacent\s+to\b/gi, replacement: "next to" },
  { pattern: /\bcommencement\b/gi, replacement: "start of construction" },
  { pattern: /\bprior\s+to\b/gi, replacement: "before" },
  { pattern: /\bsubject\s+to\b/gi, replacement: "must respect" },
];

function applyOne(text: string, rule: Replacement): string {
  if (typeof rule.pattern === "string") {
    return text.split(rule.pattern).join(typeof rule.replacement === "string" ? rule.replacement : "");
  }
  if (typeof rule.replacement === "string") {
    return text.replace(rule.pattern, rule.replacement);
  }
  // Function replacement — call per match.
  return text.replace(rule.pattern, (...args: unknown[]) => {
    const match = args[0] as string;
    const groups: string[] = [];
    for (let i = 1; i < args.length; i++) {
      const a = args[i];
      if (typeof a === "string") groups.push(a);
      else break; // numeric (offset) or full string follows
    }
    const fakeMatch = [match, ...groups] as unknown as RegExpMatchArray;
    return (rule.replacement as (m: RegExpMatchArray) => string)(fakeMatch);
  });
}

/** Capitalize the first letter of every sentence-like fragment. */
function sentenceCase(text: string): string {
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
}

/**
 * Rewrite DDA-jargon notes into plain English. Returns the rewritten
 * string, or `null` if the input is null/empty/whitespace. Never
 * returns null on a non-empty input.
 *
 * Two-phase pipeline:
 *   1. PHRASE_REPLACEMENTS — multi-word DDA boilerplate → canonical
 *      English sentences (run first so the abbreviations they include
 *      are still in their original form when matched).
 *   2. TERM_REPLACEMENTS — abbreviation expansions, unit expansions,
 *      and standalone term rephrases.
 *   Then: collapse runs of whitespace, fix sentence-case capitalization.
 */
export function rewriteNotes(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  let out = trimmed;
  for (const rule of PHRASE_REPLACEMENTS) out = applyOne(out, rule);
  for (const rule of TERM_REPLACEMENTS) out = applyOne(out, rule);

  // Whitespace cleanup — collapse runs of spaces, preserve paragraph breaks.
  out = out
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  // Sentence-case the output. Phrase replacements may have started
  // mid-sentence with a lowercase word, e.g. "the total floor area..."
  out = sentenceCase(out);

  // Make sure the very first character is uppercase (sentenceCase
  // already handles this for `^` but only if a letter follows immediately).
  if (out.length > 0) out = out[0].toUpperCase() + out.slice(1);

  return out;
}
