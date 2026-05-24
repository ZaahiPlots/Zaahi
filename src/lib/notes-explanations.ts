/**
 * Catalog of plain-English ZAAHI explanations attached to typical
 * DDA / Trakhees / DCAA / RERA affection-plan sentences.
 *
 * Source documentation:
 *   docs/specs/site-plan-v2/SITE_PLAN_IMPROVEMENTS_2026-05-24.md §1.2
 *
 * Design principles (founder approved 2026-05-24):
 *   1. Hardcoded — no AI generation. Regulatory interpretation must
 *      be auditable.
 *   2. Patterns NEVER invent facts. A sentence that doesn't match
 *      any pattern is rendered as-is, without an explanation line.
 *   3. Catalog is closed at 13 entries for Phase B. Future additions
 *      require founder review (each new entry is a regulatory claim).
 *   4. Explanations target the buyer / broker / developer who reads
 *      the Site Plan PDF — not the surveyor who wrote the source
 *      text. Plain English; no jargon; <= 3 PDF lines after wrap.
 */

export interface NotesExplanation {
  /** Stable id — used for logging / future dedupe. */
  id: string;
  /** Regex (case-insensitive) tested against an individual sentence. */
  pattern: RegExp;
  /** Plain-English ZAAHI explanation. Single string, may wrap to 2–3 PDF lines. */
  explanation: string;
}

export const NOTES_EXPLANATIONS: readonly NotesExplanation[] = [
  {
    id: "approved-master-plan",
    pattern: /\bAPPROVED\s+MASTER\s+PLAN\s+IS\s+REQUIRED\s+PRIOR\s+TO\s+ANY\s+SUBMITTAL/i,
    explanation:
      "The plot sits inside a master-planned community whose overall plan has not yet been signed off by DDA. Until that happens, no individual building permit, NOC, or affection plan request will be accepted. The master developer (see Project field) is the one who files the master plan — buyers cannot bypass this.",
  },
  {
    id: "dubai-2040",
    pattern: /\bDUBAI\s+2040\s+(?:URBAN\s+MASTER\s+)?PLAN\b/i,
    explanation:
      "Permitted uses, height, and density on this plot are framed by the Dubai 2040 Urban Master Plan (the 20-year zoning framework, 5 urban centres + green-network rules). Plots marked Future Development are placeholders until the 2040 sub-zone is finalised — values shown as SEE NOTES mean not yet set.",
  },
  {
    id: "dcaa-aviation",
    pattern: /\bsubject\s+to\s+(?:obtain\s+)?approval\s+from\s+(?:the\s+)?Dubai\s+Civil\s+Aviation\s+Authority\b|\bDCAA\b/i,
    explanation:
      "The plot is inside an aviation height-restriction zone (typically within 6 km of DXB or DWC). Any structure above roughly 45 m / G+12 needs a separate NOC from DCAA before construction starts. Skipping this NOC is the most common cause of stop-work orders on tall projects in West Dubai.",
  },
  {
    id: "trakhees",
    pattern: /\bTrakhees\b|\bPCFC\b|\bTECOM\b/i,
    explanation:
      "The plot is under Trakhees jurisdiction (Ports, Customs & Free Zone Corporation), not DDA. Building permits, fire approvals, and infrastructure NOCs all go through Trakhees in Jebel Ali — NOT the DDA portal. Lead times are longer (~6–12 weeks). The building code is the federal Dubai Building Code, with Trakhees-specific overlays for free-zone parcels.",
  },
  {
    id: "rera",
    pattern: /\bRERA\b/i,
    explanation:
      "RERA (Dubai's real-estate regulator) must approve any sale-to-public of units before the building exists. Without RERA pre-approval the project cannot accept down-payments from buyers and escrow accounts cannot be opened. Applies when units are sold off-plan.",
  },
  {
    id: "oqood",
    pattern: /\bOqood\b/i,
    explanation:
      "Oqood is the off-plan unit registration system run by DLD. Every individual unit in the future building gets its own Oqood entry. Without Oqood, off-plan unit transfers cannot be DLD-recorded and the SPA is not legally enforceable.",
  },
  {
    id: "parking-ratio",
    pattern: /\bParking\s+ratio\b|\b\d+(?:\.\d+)?\s*per\s+(?:unit|bedroom)\b|\bparking\s+per\b/i,
    explanation:
      "This is the minimum on-plot parking the developer must build. For 100 residential units at 1.0 + 0.2 visitor = 120 spaces. Under-providing is the most common reason plan revisions get rejected by Dubai Municipality. Check the latest Building Permission Manual table for the ratio per land use.",
  },
  {
    id: "setbacks",
    pattern: /\bset\s*backs?\b/i,
    explanation:
      "These are the minimum distances the building must stand back from each side of the plot. Podium (the wide low base) usually has smaller setbacks than the tower above. The ground inside the setback stays unbuilt — landscaping, driveway, walkway — and counts against your effective buildable footprint.",
  },
  {
    id: "far",
    pattern: /\bFAR\b|\bfloor[- ]area\s+ratio\b/i,
    explanation:
      "Floor-area ratio. Multiplies plot area to give the maximum total floor area allowed (sum of all floors). FAR 2.5 on a 1,000 m² plot = 2,500 m² of buildable floor area total, regardless of how tall or wide.",
  },
  {
    id: "see-notes",
    pattern: /\bSEE\s+NOTES\b/i,
    explanation:
      "The value is not yet fixed by the authority — usually because the master plan for this community is still pending approval. Treat the plot as subject to revision for GFA / height / coverage until the master plan goes through. Do not commit to a build-volume assumption based on the affection plan alone.",
  },
  {
    id: "plot-coverage",
    pattern: /\b(?:Covered\s+area|plot\s+coverage|coverage)\b.{0,40}\d{1,3}\s*%/i,
    explanation:
      "Hard cap on the footprint at each level: at ground & podium, the building can occupy at most the stated percentage of the plot area; above the podium the tower must shrink further. Coverage is independent of FAR — both limits must be respected.",
  },
  {
    id: "height-code",
    pattern: /\b(?:P\s*\+\s*)?G\s*\+\s*\d+\b/i,
    explanation:
      "Building height code. G = ground floor; P = parking podium (if present); the number is upper floors above. Used together with FAR to size the project envelope. Each level is typically 3.5 m of structural height.",
  },
  {
    id: "future-development",
    pattern: /\bFuture\s+Development\b/i,
    explanation:
      "DDA placeholder land-use class — the parcel exists on the master plan but its final land use (residential / commercial / mixed / etc.) is not yet decided. Treat the plot as raw land. ZAAHI does not render a 3D building envelope for Future Development plots, only the outline.",
  },
];

/**
 * Return the ZAAHI explanation for a single sentence, or `null` if
 * no catalog pattern matches.
 */
export function explainSentence(sentence: string): string | null {
  for (const entry of NOTES_EXPLANATIONS) {
    if (entry.pattern.test(sentence)) return entry.explanation;
  }
  return null;
}

export interface NoteWithExplanation {
  /** The original sentence (already passed through stripInternalLines + notes-rewriter). */
  official: string;
  /** ZAAHI plain-English explanation, or `null` when no pattern matched. */
  explanation: string | null;
}

/**
 * Split a notes string into sentences and attach an explanation
 * (or null) to each. The caller is responsible for upstream cleaning
 * — `stripInternalLines` and `rewriteNotes` should both run before
 * this so the explanations align with the rewritten, public-facing
 * text. Returns an empty array on empty / null input.
 */
export function explainNotes(
  notes: string | null | undefined,
): NoteWithExplanation[] {
  if (notes == null) return [];
  const trimmed = notes.trim();
  if (trimmed.length === 0) return [];
  return trimmed
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => ({ official: s, explanation: explainSentence(s) }));
}
