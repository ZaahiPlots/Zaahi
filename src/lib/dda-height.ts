// DDA MAX_HEIGHT_FLOORS code → hover-card text. Pure, no imports.
//
// The tile bake (scripts/prepare-tiles.ts normalizeDdaHeightCode) already drops
// non-code text ("N/A", "SEE NOTES", ...), so a missing/empty property means
// "not published": return "" and the caller hides the row. Old tiles have no
// such property at all — same result.

/** "G+17" → "G+17", "UNLIMITED" → "Unlimited", missing / non-string → "". */
export function formatDdaMaxHeight(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const v = raw.trim();
  if (!v) return "";
  return /^unlimited$/i.test(v) ? "Unlimited" : v;
}
