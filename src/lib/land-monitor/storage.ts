import { promises as fs } from "node:fs";
import path from "node:path";
import type { CacheShape, FeedItem, IngestStats } from "./types";

// MVP persistence: a single JSON file. Production will swap this for a
// Prisma model (Advertisement / AdvertisementSource per Spec 09 §3.4) once
// the founder green-lights the migration. The interface here mirrors the
// eventual Prisma calls so the swap is a file-replace.

const CACHE_DIR = path.join(process.cwd(), "data/land-monitor");
const CACHE_PATH = path.join(CACHE_DIR, "cache.json");
const MAX_ITEMS = 500;

async function ensureDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

const EMPTY_STATS: IngestStats = {
  totalFetched: 0,
  perSource: {
    REDDIT: 0,
    DLD_PULSE: 0,
    DLD_TRANSACTIONS_CSV: 0,
    SKIPPED_PORTALS: 0,
  },
  extracted: 0,
  matched: 0,
  skippedPortals: [],
  startedAt: "",
  finishedAt: "",
  durationMs: 0,
  errors: [],
};

export function emptyCache(): CacheShape {
  return {
    schemaVersion: 1,
    lastIngestedAt: null,
    items: [],
    stats: { ...EMPTY_STATS },
  };
}

export async function readCache(): Promise<CacheShape> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as CacheShape;
    if (!parsed || parsed.schemaVersion !== 1) return emptyCache();
    return parsed;
  } catch {
    return emptyCache();
  }
}

export async function writeCache(cache: CacheShape): Promise<void> {
  await ensureDir();
  // Hard cap to avoid runaway file growth — drop oldest by ingestedAt.
  const sorted = [...cache.items].sort(
    (a, b) => new Date(b.ingestedAt).getTime() - new Date(a.ingestedAt).getTime(),
  );
  const trimmed = sorted.slice(0, MAX_ITEMS);
  const payload: CacheShape = { ...cache, items: trimmed };
  await fs.writeFile(CACHE_PATH, JSON.stringify(payload, null, 2), "utf8");
}

export async function mergeItems(
  existing: FeedItem[],
  incoming: FeedItem[],
): Promise<FeedItem[]> {
  // Dedup by id (hash of source+sourceId). Incoming wins on conflict so a
  // re-extracted post reflects the latest Claude output.
  const byId = new Map<string, FeedItem>();
  for (const it of existing) byId.set(it.id, it);
  for (const it of incoming) byId.set(it.id, it);
  return Array.from(byId.values());
}

export const STORAGE_PATHS = {
  cacheDir: CACHE_DIR,
  cacheFile: CACHE_PATH,
  maxItems: MAX_ITEMS,
};
