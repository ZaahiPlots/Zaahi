"use client";

// Spec 09 descoped MVP · Land Advertisement Monitor — internal preview only.
//
// What this page does:
//   - fetches GET /api/land-monitor/feed to render the Reddit + DLD items,
//   - POSTs /api/land-monitor/ingest when the user clicks "Refresh Now",
//   - renders a 40/60 split feed+map layout,
//   - drops red dots on the map for items with a plot-match.
//
// What it does NOT do (Spec 09 §1.3 + task scope):
//   - no WhatsApp · Telegram · Instagram · Facebook · LinkedIn · Twitter,
//   - no Bayut / PropertyFinder / Dubizzle (ToS · skipped · flagged in UI),
//   - no lead capture · no broker phone numbers in the UI · no writes to
//     prisma (storage is data/land-monitor/cache.json, outside git).
//
// ZAAHI Signature is untouched. This route renders an independent MapLibre
// instance and does not touch src/app/parcels/map/page.tsx.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MLMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/lib/api-fetch";
import type { FeedItem, IngestStats, Source } from "@/lib/land-monitor/types";

const DUBAI_CENTER: [number, number] = [55.2708, 25.2048];

const DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© CARTO © OpenStreetMap contributors",
    },
  },
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

interface FeedResponse {
  ok?: boolean;
  lastIngestedAt: string | null;
  stats: IngestStats;
  items: FeedItem[];
}

const SOURCE_LABEL: Record<Source, string> = {
  REDDIT: "Reddit",
  DLD_PULSE: "DLD Pulse",
  DLD_TRANSACTIONS_CSV: "DLD CSV",
};

function formatAed(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n}`;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const d = Math.floor(hr / 24);
  return `${d} d ago`;
}

function Page() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<Source | "ALL">("ALL");

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch("/api/land-monitor/feed");
      if (!r.ok) {
        setError(`feed returned ${r.status}`);
        return;
      }
      const data = (await r.json()) as FeedResponse;
      setFeed(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerIngest = useCallback(async () => {
    setIngesting(true);
    setError(null);
    try {
      const r = await apiFetch("/api/land-monitor/ingest", { method: "POST" });
      if (!r.ok) {
        setError(`ingest returned ${r.status}`);
        return;
      }
      // Ingest returns stats — re-fetch the feed to get the updated items.
      await loadFeed();
    } catch (e) {
      setError(String(e));
    } finally {
      setIngesting(false);
    }
  }, [loadFeed]);

  // Initial load.
  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Init map once.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DARK_STYLE,
      center: DUBAI_CENTER,
      zoom: 10.5,
      pitch: 0,
      bearing: 0,
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;
    map.on("load", () => {
      map.addSource("matches", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "matches-glow",
        type: "circle",
        source: "matches",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9, 8,
            14, 20,
          ],
          "circle-color": "#E63946",
          "circle-opacity": 0.18,
          "circle-blur": 0.6,
        },
      });
      map.addLayer({
        id: "matches-dot",
        type: "circle",
        source: "matches",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9, 4,
            14, 9,
          ],
          "circle-color": "#E63946",
          "circle-stroke-color": "#C8A96E",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.95,
        },
      });
      map.on("click", "matches-dot", (e) => {
        const f = e.features?.[0];
        const id = f?.properties?.id as string | undefined;
        if (id) setSelectedId(id);
      });
      map.on("mouseenter", "matches-dot", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "matches-dot", () => {
        map.getCanvas().style.cursor = "";
      });
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (!feed?.items) return [];
    const items =
      sourceFilter === "ALL"
        ? feed.items
        : feed.items.filter((i) => i.source === sourceFilter);
    // Newest first.
    return [...items].sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
    );
  }, [feed, sourceFilter]);

  // Update map markers when feed changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("matches") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const features = filteredItems
      .filter((i) => i.match && Number.isFinite(i.match.lng) && Number.isFinite(i.match.lat))
      .map((i) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [i.match!.lng, i.match!.lat],
        },
        properties: {
          id: i.id,
          tier: i.match!.tier,
        },
      }));
    src.setData({ type: "FeatureCollection", features });
  }, [filteredItems]);

  const matched = filteredItems.filter((i) => i.match).length;
  const unmatched = filteredItems.length - matched;

  const panToItem = useCallback((item: FeedItem) => {
    const map = mapRef.current;
    if (!map || !item.match) return;
    map.flyTo({
      center: [item.match.lng, item.match.lat],
      zoom: 15,
      essential: true,
    });
    setSelectedId(item.id);
  }, []);

  const selected = selectedId ? filteredItems.find((i) => i.id === selectedId) : null;

  return (
    <main style={{ position: "fixed", inset: 0, color: "#f5f1e8", background: "#0a1628" }}>
      {/* Header */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 20px",
          background: "rgba(10, 22, 40, 0.85)",
          borderBottom: "1px solid rgba(200, 169, 110, 0.15)",
          backdropFilter: "blur(16px) saturate(150%)",
          zIndex: 20,
        }}
      >
        <Link
          href="/parcels/map"
          style={{
            color: "#C8A96E",
            textDecoration: "none",
            fontSize: 14,
            letterSpacing: "0.05em",
            border: "1px solid rgba(200, 169, 110, 0.3)",
            padding: "6px 12px",
            borderRadius: 8,
            background: "rgba(10, 22, 40, 0.4)",
          }}
        >
          ← Map
        </Link>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 18,
              letterSpacing: "0.02em",
            }}
          >
            ZAAHI Land Monitor
          </div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(200, 169, 110, 0.8)",
              marginTop: 2,
            }}
          >
            Public Sources Only · Internal Preview
          </div>
        </div>
        {/* Stats */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 12 }}>
          <Stat label="TOTAL" value={String(filteredItems.length)} />
          <Stat label="MATCHED" value={String(matched)} accent />
          <Stat label="UNMATCHED" value={String(unmatched)} />
          <Stat
            label="LAST SYNC"
            value={feed?.lastIngestedAt ? timeAgo(feed.lastIngestedAt) : "never"}
          />
        </div>
        <button
          type="button"
          onClick={triggerIngest}
          disabled={ingesting}
          style={{
            color: "#C8A96E",
            background: ingesting ? "rgba(200, 169, 110, 0.1)" : "rgba(200, 169, 110, 0.15)",
            border: "1px solid rgba(200, 169, 110, 0.4)",
            padding: "8px 16px",
            borderRadius: 12,
            fontSize: 13,
            letterSpacing: "0.05em",
            cursor: ingesting ? "wait" : "pointer",
            transition: "background 150ms ease, border-color 150ms ease",
          }}
        >
          {ingesting ? "Ingesting…" : "Refresh Now"}
        </button>
      </header>

      {/* Internal-preview banner */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 0,
          right: 0,
          padding: "8px 20px",
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(230, 126, 34, 0.9)",
          background: "rgba(230, 126, 34, 0.08)",
          borderBottom: "1px solid rgba(230, 126, 34, 0.25)",
          zIndex: 19,
        }}
      >
        Internal preview — founder + pilot brokers only · not for public distribution until Spec 10 + DPO engagement (AUDIT-H03)
      </div>

      {/* Main area 40/60 split */}
      <section
        style={{
          position: "absolute",
          top: 96,
          left: 0,
          right: 0,
          bottom: 48,
          display: "flex",
        }}
      >
        {/* Left: feed */}
        <div
          style={{
            width: "40%",
            minWidth: 380,
            borderRight: "1px solid rgba(200, 169, 110, 0.15)",
            background: "rgba(10, 22, 40, 0.5)",
            backdropFilter: "blur(16px) saturate(150%)",
            overflowY: "auto",
            padding: "16px 16px 24px",
          }}
        >
          {/* Filter row */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {(["ALL", "REDDIT", "DLD_TRANSACTIONS_CSV", "DLD_PULSE"] as const).map((s) => (
              <FilterChip
                key={s}
                active={sourceFilter === s}
                onClick={() => setSourceFilter(s)}
                label={s === "ALL" ? "All sources" : SOURCE_LABEL[s as Source]}
              />
            ))}
          </div>

          {error && (
            <div
              style={{
                background: "rgba(230, 57, 70, 0.15)",
                border: "1px solid rgba(230, 57, 70, 0.35)",
                borderRadius: 12,
                padding: 12,
                fontSize: 12,
                marginBottom: 12,
                color: "#f5f1e8",
              }}
            >
              Error: {error}
            </div>
          )}

          {loading && !feed && (
            <div style={{ opacity: 0.6, fontSize: 13 }}>Loading feed…</div>
          )}

          {!loading && filteredItems.length === 0 && (
            <EmptyState onRefresh={triggerIngest} ingesting={ingesting} />
          )}

          {filteredItems.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              onSelect={() => setSelectedId(item.id)}
              onMatch={() => panToItem(item)}
            />
          ))}

          {/* Skipped portals honesty block */}
          {feed?.stats.skippedPortals && feed.stats.skippedPortals.length > 0 && (
            <SkippedBlock items={feed.stats.skippedPortals} />
          )}
        </div>

        {/* Right: map */}
        <div style={{ flex: 1, position: "relative" }}>
          <div ref={mapContainerRef} style={{ position: "absolute", inset: 0 }} />
          {selected && (
            <SelectedPopover item={selected} onClose={() => setSelectedId(null)} />
          )}
          <MapLegend />
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 48,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          fontSize: 11,
          letterSpacing: "0.04em",
          color: "rgba(245, 241, 232, 0.55)",
          background: "rgba(10, 22, 40, 0.85)",
          borderTop: "1px solid rgba(200, 169, 110, 0.15)",
          backdropFilter: "blur(16px) saturate(150%)",
          zIndex: 20,
        }}
      >
        Data sources: Dubai Land Department (public open-data) · Reddit public JSON. All sources are publicly accessible; ZAAHI aggregates and cross-references; no private data collection. See <code style={{ color: "#C8A96E" }}>docs/specs/phase-2/09-LAND_AD_MONITOR_FEASIBILITY_v1.0.md</code> for legal posture.
      </footer>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(200, 169, 110, 0.7)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: accent ? "#C8A96E" : "#f5f1e8",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 11,
        letterSpacing: "0.06em",
        padding: "5px 10px",
        borderRadius: 10,
        cursor: "pointer",
        color: active ? "#C8A96E" : "rgba(245, 241, 232, 0.6)",
        background: active ? "rgba(200, 169, 110, 0.15)" : "rgba(255, 255, 255, 0.04)",
        border: active ? "1px solid rgba(200, 169, 110, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
        transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
      }}
    >
      {label}
    </button>
  );
}

function FeedCard({
  item,
  selected,
  onSelect,
  onMatch,
}: {
  item: FeedItem;
  selected: boolean;
  onSelect: () => void;
  onMatch: () => void;
}) {
  const price = formatAed(item.extracted?.priceAed ?? null);
  const hasExtract = !!item.extracted;
  return (
    <article
      onClick={onSelect}
      style={{
        marginBottom: 10,
        padding: 12,
        borderRadius: 14,
        background: selected ? "rgba(200, 169, 110, 0.08)" : "rgba(10, 22, 40, 0.4)",
        border: selected
          ? "1px solid rgba(200, 169, 110, 0.4)"
          : "1px solid rgba(200, 169, 110, 0.15)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "background 150ms ease, border-color 150ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#C8A96E",
            background: "rgba(200, 169, 110, 0.12)",
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          {item.sourceLabel}
        </span>
        <span style={{ fontSize: 11, color: "rgba(245, 241, 232, 0.4)" }}>
          {timeAgo(item.postedAt)}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
      <div style={{ fontSize: 12, color: "rgba(245, 241, 232, 0.6)", marginBottom: 8, lineHeight: 1.4 }}>
        {item.snippet}
        {item.snippet.length >= 200 ? "…" : ""}
      </div>

      {/* Extracted chips */}
      {hasExtract && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {item.extracted?.plotNumber && (
            <Chip label={`Plot ${item.extracted.plotNumber}`} tone="gold" />
          )}
          {item.extracted?.community && <Chip label={item.extracted.community} tone="teal" />}
          {price && <Chip label={price} tone="green" />}
          {item.extracted?.areaSqft && (
            <Chip label={`${item.extracted.areaSqft.toLocaleString("en-US")} sqft`} tone="subtle" />
          )}
          {item.extracted?.transactionType && (
            <Chip label={item.extracted.transactionType} tone="subtle" />
          )}
        </div>
      )}

      {/* Match indicator */}
      {item.match ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginTop: 4 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: item.match.tier === 1 ? "#2D6A4F" : item.match.tier === 2 ? "#E67E22" : "#6B7280",
            }}
          />
          <span style={{ color: "rgba(245, 241, 232, 0.7)" }}>
            {item.match.tier === 1
              ? `Matched plot · ${item.match.plotNumber}`
              : `Community match · ${item.match.community}`}
            <span style={{ color: "rgba(245, 241, 232, 0.4)", marginLeft: 6 }}>
              ({Math.round(item.match.confidence * 100)}%)
            </span>
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMatch();
            }}
            style={{
              marginLeft: "auto",
              color: "#C8A96E",
              background: "rgba(200, 169, 110, 0.12)",
              border: "1px solid rgba(200, 169, 110, 0.3)",
              padding: "3px 8px",
              borderRadius: 8,
              fontSize: 10,
              letterSpacing: "0.05em",
              cursor: "pointer",
            }}
          >
            On map →
          </button>
        </div>
      ) : hasExtract ? (
        <div style={{ fontSize: 11, color: "rgba(245, 241, 232, 0.4)", marginTop: 4 }}>
          No plot match · extracted but unlocated
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "rgba(245, 241, 232, 0.35)", marginTop: 4 }}>
          Not classified as a land-plot post · no extraction attempted
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
          fontSize: 11,
          color: "rgba(245, 241, 232, 0.5)",
        }}
      >
        <span>{item.author ?? ""}</span>
        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: "#C8A96E", textDecoration: "none" }}
          >
            View source ↗
          </a>
        )}
      </div>
    </article>
  );
}

function Chip({ label, tone }: { label: string; tone: "gold" | "teal" | "green" | "subtle" }) {
  const palette: Record<typeof tone, { bg: string; fg: string; border: string }> = {
    gold: { bg: "rgba(200, 169, 110, 0.15)", fg: "#C8A96E", border: "rgba(200, 169, 110, 0.4)" },
    teal: { bg: "rgba(27, 73, 101, 0.2)", fg: "#74C0D9", border: "rgba(27, 73, 101, 0.5)" },
    green: { bg: "rgba(45, 106, 79, 0.18)", fg: "#81D4A4", border: "rgba(45, 106, 79, 0.45)" },
    subtle: {
      bg: "rgba(255, 255, 255, 0.05)",
      fg: "rgba(245, 241, 232, 0.75)",
      border: "rgba(255, 255, 255, 0.12)",
    },
  };
  const c = palette[tone];
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 6,
        color: c.fg,
        background: c.bg,
        border: `1px solid ${c.border}`,
      }}
    >
      {label}
    </span>
  );
}

function EmptyState({ onRefresh, ingesting }: { onRefresh: () => void; ingesting: boolean }) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 14,
        background: "rgba(10, 22, 40, 0.4)",
        border: "1px solid rgba(200, 169, 110, 0.15)",
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: "Georgia, serif", fontSize: 16, marginBottom: 8 }}>
        No items yet
      </div>
      <div style={{ fontSize: 12, color: "rgba(245, 241, 232, 0.55)", marginBottom: 14, lineHeight: 1.5 }}>
        The cache is empty. Click <b>Refresh Now</b> to pull from Reddit (r/dubai · r/dubairealestate · r/UAE) and DLD Open Data. First ingest takes ~20–40 s.
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={ingesting}
        style={{
          color: "#C8A96E",
          background: "rgba(200, 169, 110, 0.15)",
          border: "1px solid rgba(200, 169, 110, 0.4)",
          padding: "8px 16px",
          borderRadius: 12,
          fontSize: 13,
          letterSpacing: "0.05em",
          cursor: ingesting ? "wait" : "pointer",
        }}
      >
        {ingesting ? "Ingesting…" : "Refresh Now"}
      </button>
    </div>
  );
}

function SkippedBlock({ items }: { items: string[] }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 12,
        borderRadius: 12,
        background: "rgba(230, 126, 34, 0.06)",
        border: "1px solid rgba(230, 126, 34, 0.2)",
        fontSize: 11,
        color: "rgba(245, 241, 232, 0.7)",
        lineHeight: 1.55,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(230, 126, 34, 0.9)",
          marginBottom: 6,
        }}
      >
        Skipped sources (ToS)
      </div>
      {items.map((s, i) => (
        <div key={i} style={{ marginBottom: 3 }}>• {s}</div>
      ))}
    </div>
  );
}

function SelectedPopover({ item, onClose }: { item: FeedItem; onClose: () => void }) {
  const price = formatAed(item.extracted?.priceAed ?? null);
  return (
    <div
      style={{
        position: "absolute",
        left: 16,
        bottom: 16,
        maxWidth: 360,
        padding: 14,
        borderRadius: 14,
        background: "rgba(10, 22, 40, 0.85)",
        border: "1px solid rgba(200, 169, 110, 0.3)",
        backdropFilter: "blur(24px) saturate(160%)",
        boxShadow: "0 20px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
        color: "#f5f1e8",
        zIndex: 15,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#C8A96E",
          }}
        >
          {item.sourceLabel}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            color: "rgba(245, 241, 232, 0.5)",
            background: "transparent",
            border: "none",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{item.title}</div>
      {price && (
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#C8A96E",
            marginBottom: 6,
          }}
        >
          {price}
        </div>
      )}
      <div style={{ fontSize: 12, color: "rgba(245, 241, 232, 0.7)", marginBottom: 8 }}>
        {item.snippet}
        {item.snippet.length >= 200 ? "…" : ""}
      </div>
      {item.sourceUrl && (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#C8A96E", fontSize: 12, textDecoration: "none" }}
        >
          View original ↗
        </a>
      )}
    </div>
  );
}

function MapLegend() {
  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        top: 16,
        padding: 10,
        borderRadius: 10,
        background: "rgba(10, 22, 40, 0.6)",
        border: "1px solid rgba(200, 169, 110, 0.15)",
        backdropFilter: "blur(16px)",
        fontSize: 11,
        color: "rgba(245, 241, 232, 0.7)",
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(200, 169, 110, 0.7)",
          marginBottom: 6,
        }}
      >
        Legend
      </div>
      <LegendRow color="#2D6A4F" label="Tier-1 · exact plot" />
      <LegendRow color="#E67E22" label="Tier-2 · community" />
      <LegendRow color="#6B7280" label="Tier-3 · spatial" />
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, lineHeight: 1.6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
      <span>{label}</span>
    </div>
  );
}

export default function LandMonitorPage() {
  return (
    <AuthGuard>
      <Page />
    </AuthGuard>
  );
}
