// Emirate string normalisation — completes founder D11 fix
// (docs/specs/non-dda-plot-entry-DESIGN.md).
//
// The platform stores Parcel.emirate in title-case ("Dubai", "Abu Dhabi",
// "Sharjah", "Ras Al Khaimah", …) but the cohort registration wizard
// + Archie tool args + a couple of other surfaces ship the value in
// SCREAMING_SNAKE_CASE ("DUBAI", "ABU_DHABI", "RAS_AL_KHAIMAH"). When
// the lookup queries don't normalise, AD plots in the index look
// "missing" because the where-clause filter compares "ABU_DHABI"
// (input) vs "Abu Dhabi" (storage).
//
// A naïve "first char upper, rest lower" implementation got "Abu
// Dhabi" wrong — it produced "Abu dhabi" (lowercase D) because the
// `_ → space` replace runs on the already-lowercased rest. The
// version below capitalises every word boundary, so two-word emirates
// land correctly.
//
// Used by: /api/me/vault/plot-lookup, /api/me/vault/entries (Sprint 1
// ensureVaultPrivateParcel), /api/parcels/submit, /lib/parcel-create,
// /api/archie/resolve-district. Any future call that takes a
// caller-supplied emirate string and needs to query Parcel.emirate
// should route through this helper.

/**
 * Title-case an emirate string regardless of whether the caller
 * shipped it as SCREAMING_SNAKE_CASE ("ABU_DHABI"), lowercase
 * ("abu dhabi"), or already title-case ("Abu Dhabi").
 *
 * Output examples:
 *   normalizeEmirate("ABU_DHABI")     → "Abu Dhabi"
 *   normalizeEmirate("DUBAI")         → "Dubai"
 *   normalizeEmirate("abu dhabi")     → "Abu Dhabi"
 *   normalizeEmirate("Abu Dhabi")     → "Abu Dhabi"
 *   normalizeEmirate("ras_al_khaimah") → "Ras Al Khaimah"
 *   normalizeEmirate("")              → ""
 */
export function normalizeEmirate(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build the set of emirate spellings worth checking in a Prisma `in`
 * filter when the caller passed a single emirate string. Covers the
 * normalised title-case (storage standard) plus the raw upper-snake
 * (cohort wizard) plus the raw value itself — three forms so the
 * lookup matches no matter how the rows were originally written.
 */
export function emirateMatchVariants(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const out = new Set<string>();
  out.add(normalizeEmirate(trimmed));
  out.add(trimmed.toUpperCase().replace(/\s+/g, "_"));
  out.add(trimmed);
  return Array.from(out);
}
