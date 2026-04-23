// Spec 09 descoped MVP · Land Ad Monitor types.
// No prisma changes today — persistence is a JSON file in data/land-monitor/.
// Fields mirror the Spec 09 §3.4.1 Advertisement schema at a minimum so a
// future prisma migration can be a straight field-for-field mapping.

export type Source = "REDDIT" | "DLD_PULSE" | "DLD_TRANSACTIONS_CSV";

export interface ExtractedFields {
  plotNumber: string | null;
  community: string | null;
  priceAed: number | null;
  areaSqft: number | null;
  transactionType: "sale" | "rent" | null;
  brokerName: string | null;
  // Phone deliberately *captured* for audit trail but not surfaced in feed API
  // (PDPL display-reduction per Spec 09 §4.5). Server-side only.
  brokerPhone: string | null;
  confidence: number;
}

export type MatchTier = 1 | 2 | 3 | null;

export interface PlotMatch {
  plotNumber: string;
  lng: number;
  lat: number;
  community: string | null;
  tier: MatchTier; // 1 = exact plot · 2 = community+attribute · 3 = coordinates · null = unmatched
  confidence: number;
}

export interface FeedItem {
  id: string; // hash of (source, sourceId)
  source: Source;
  sourceLabel: string; // "r/dubai" · "DLD Pulse" etc.
  sourceUrl: string | null;
  sourceId: string; // reddit post id · DLD transaction id
  title: string;
  snippet: string; // first 200 chars of body
  postedAt: string; // ISO UTC
  ingestedAt: string; // ISO UTC
  extracted: ExtractedFields | null; // null = Claude Haiku said "not a land plot"
  match: PlotMatch | null;
  author: string | null; // "u/foo" for Reddit · null elsewhere
}

export interface CacheShape {
  schemaVersion: 1;
  lastIngestedAt: string | null;
  items: FeedItem[];
  stats: IngestStats;
}

export interface IngestStats {
  totalFetched: number;
  perSource: Record<Source | "SKIPPED_PORTALS", number>;
  extracted: number; // posts where Claude returned structured data
  matched: number; // items with match.tier !== null
  skippedPortals: string[]; // "Bayut (ToS)" · "PropertyFinder (ToS)" · "Dubizzle (ToS)"
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  errors: string[];
}
