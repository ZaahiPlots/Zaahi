"use client";

// ZAAHI drone — community status aggregate loader + lookup.
//
// Sources:
//   /public/data/community-status-aggregate.json
//   produced by /home/zaahi/scratch/drone-fps/aggregate-status-by-community.mjs
//
// Schema lines up with the script — see header there. Status mapping
// (founder ratified 2026-06-10):
//   completed | underConstruction | preConstruction | suspended | empty
//
// IMPORTANT (founder rule): when PMTiles / tile sources are rebuilt the
// aggregate must be re-generated and re-copied here. The drone Intel
// card surfaces "(no data)" for any community whose key is missing.

export type StatusBucket = "completed" | "underConstruction" | "preConstruction" | "empty" | "suspended";

export interface CommunityRow {
  name: string;
  emirate: "Dubai" | "Abu Dhabi";
  totalPlots: number;
  totalAreaSqft: number;
  byStatus: Record<StatusBucket, number>;
}

export interface AggregateFile {
  generatedAt: string;
  mode: "FULL" | "SAMPLE";
  totalCommunities: number;
  unmappedStatusValues: Record<string, number>;
  communities: Record<string, CommunityRow>;
}

const URL_PATH = "/data/community-status-aggregate.json";

let cache: AggregateFile | null = null;
let inflight: Promise<AggregateFile> | null = null;

function normaliseKey(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

export async function loadAggregate(): Promise<AggregateFile> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = fetch(URL_PATH, { cache: "force-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`aggregate fetch ${r.status}`);
      return r.json();
    })
    .then((data: AggregateFile) => {
      cache = data;
      inflight = null;
      return data;
    })
    .catch((e) => {
      inflight = null;
      throw e;
    });
  return inflight;
}

/**
 * Find a row by emirate + community name. The aggregate is keyed by
 * `${emirate}::${name}` exact; we also try an uppercase-normalised
 * second pass so "Business Bay" matches "BUSINESS BAY" entries that
 * survive AD's mixed casing.
 *
 * NOTE — the reverse-district endpoint returns names from multiple
 * sources (DDA project, AD district / community / municipality, Dubai
 * KML community). The aggregate is keyed against the Dubai KML community
 * name and AD's plot-level community field. Cross-source mismatches
 * fall through to null and the Intel card renders a "no community data"
 * fallback.
 */
export function findCommunity(
  agg: AggregateFile,
  emirate: "Dubai" | "Abu Dhabi" | string,
  name: string,
): CommunityRow | null {
  if (!name) return null;
  // Coerce the emirate prefix into one of the two we store.
  const e: "Dubai" | "Abu Dhabi" =
    emirate.toUpperCase().startsWith("ABU") ? "Abu Dhabi" : "Dubai";
  const exact = agg.communities[`${e}::${name}`];
  if (exact) return exact;
  const normTarget = normaliseKey(name);
  for (const [key, row] of Object.entries(agg.communities)) {
    if (!key.startsWith(`${e}::`)) continue;
    if (normaliseKey(row.name) === normTarget) return row;
  }
  return null;
}
