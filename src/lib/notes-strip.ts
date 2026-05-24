/**
 * Filter out ZAAHI-internal lines from AffectionPlan.notes before
 * rendering to buyers/brokers. The raw DB string is preserved (it's
 * our audit trail of how each plot was assembled — see the seed
 * scripts under `scripts/seed-*.ts`); we only strip at the rendering
 * boundary.
 *
 * Patterns documented in docs/specs/site-plan-v2/SITE_PLAN_IMPROVEMENTS_2026-05-24.md
 * §1.4. Founder approved 2026-05-24 (Phase B kickoff):
 *   - Internal lines hidden everywhere identically (no admin bypass).
 *   - Defer admin-side audit view to v3.
 *
 * Splitting strategy: sentence-level. We split on sentence terminators
 * (`.!?` followed by whitespace) and on hard newlines. Each candidate
 * sentence is matched against the prefix patterns; if it matches, it
 * is removed. The remaining sentences are joined back with a single
 * space.
 */

const INTERNAL_PREFIXES: readonly RegExp[] = [
  /^ZAAHI:/i,                              // explicit debug prefix
  /^Plot \d+ · /,                          // seed-script context line (en dash · U+00B7)
  /^Geometry: /i,                          // geometry-synthesis aside
  /^Master developer: .+ Owner/i,          // seed-script identity dump
  /^Override per founder spec/i,           // founder-spec note
  /^NOTE: synthetic /i,                    // synthetic-data flag
];

/**
 * Strip ZAAHI-internal lines from a notes string. Returns the cleaned
 * notes, or `null` if input is null/empty/whitespace, or if every
 * sentence was an internal line.
 *
 * Pure and deterministic. No DB writes.
 */
export function stripInternalLines(
  notes: string | null | undefined,
): string | null {
  if (notes == null) return null;
  const trimmed = notes.trim();
  if (trimmed.length === 0) return null;

  // Split on sentence terminator (`.!?` + whitespace) using a
  // lookbehind, and on hard newlines. Drop empties.
  const sentences = trimmed
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !INTERNAL_PREFIXES.some((rx) => rx.test(s)));

  const out = sentences.join(" ").trim();
  return out.length > 0 ? out : null;
}
