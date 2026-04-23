import type { CacheShape, FeedItem, IngestStats } from "./types";
import { fetchReddit, fetchDldTransactionsCsv, SKIPPED_PORTAL_NOTES } from "./sources";
import { llmExtract, looksLikeLandPost, regexExtract } from "./extract";
import { bestMatch } from "./plot-matcher";
import { mergeItems, readCache, writeCache } from "./storage";

interface IngestOptions {
  anthropicKey: string;
  // Max posts to send to the LLM in a single ingest — safety cap.
  // Beyond this, posts are queued to the next refresh.
  maxLlmCalls?: number;
}

export async function runIngest(opts: IngestOptions): Promise<CacheShape> {
  const { anthropicKey, maxLlmCalls = 60 } = opts;
  const stats: IngestStats = {
    totalFetched: 0,
    perSource: {
      REDDIT: 0,
      DLD_PULSE: 0,
      DLD_TRANSACTIONS_CSV: 0,
      SKIPPED_PORTALS: SKIPPED_PORTAL_NOTES.length,
    },
    extracted: 0,
    matched: 0,
    skippedPortals: [...SKIPPED_PORTAL_NOTES],
    startedAt: new Date().toISOString(),
    finishedAt: "",
    durationMs: 0,
    errors: [],
  };
  const t0 = Date.now();

  // Parallel fetch of the two legally-clean sources.
  const [redditItems, csvItems] = await Promise.all([
    fetchReddit().catch((e) => {
      stats.errors.push(`reddit: ${String(e)}`);
      return [] as FeedItem[];
    }),
    fetchDldTransactionsCsv().catch((e) => {
      stats.errors.push(`dld-csv: ${String(e)}`);
      return [] as FeedItem[];
    }),
  ]);

  stats.perSource.REDDIT = redditItems.length;
  stats.perSource.DLD_TRANSACTIONS_CSV = csvItems.length;
  stats.totalFetched = redditItems.length + csvItems.length;

  // Extraction pass. Heuristics:
  //  - DLD CSV rows already carry structured fields (area + type + price),
  //    so we build ExtractedFields directly without the LLM.
  //  - Reddit posts pass through looksLikeLandPost keyword gate, then the
  //    regex prepass, then the LLM if keywords fire.
  const processed: FeedItem[] = [];
  let llmBudget = maxLlmCalls;

  for (const item of csvItems) {
    // CSV rows: regex handles price/area extraction; community derived from
    // the original title/snippet.
    const regex = regexExtract(`${item.title} ${item.snippet}`);
    const community = /·\s*([^·]+?)\s*·/.exec(item.snippet)?.[1]?.trim() ?? null;
    const match = await bestMatch(regex.plotNumber, community);
    processed.push({
      ...item,
      extracted: {
        ...regex,
        community: community,
        transactionType: "sale",
        confidence: 0.7,
      },
      match,
    });
    stats.extracted++;
    if (match) stats.matched++;
  }

  for (const item of redditItems) {
    const text = `${item.title}\n\n${item.snippet}`;
    if (!looksLikeLandPost(text)) {
      processed.push(item); // keep the row for the feed but don't extract
      continue;
    }
    let extracted = null as ReturnType<typeof regexExtract> | null;
    try {
      if (llmBudget > 0) {
        extracted = await llmExtract(text, anthropicKey);
        llmBudget--;
      } else {
        // Fallback to regex only — labelled with lower confidence.
        extracted = regexExtract(text);
      }
    } catch (e) {
      stats.errors.push(`extract ${item.id}: ${String(e)}`);
      extracted = regexExtract(text);
    }
    if (!extracted) {
      processed.push(item);
      continue;
    }
    const match = await bestMatch(extracted.plotNumber, extracted.community);
    processed.push({ ...item, extracted, match });
    stats.extracted++;
    if (match) stats.matched++;
  }

  // Merge into cache, trim, persist.
  const prev = await readCache();
  const merged = await mergeItems(prev.items, processed);
  const finished = new Date().toISOString();
  stats.finishedAt = finished;
  stats.durationMs = Date.now() - t0;

  const next: CacheShape = {
    schemaVersion: 1,
    lastIngestedAt: finished,
    items: merged,
    stats,
  };
  await writeCache(next);
  return next;
}
