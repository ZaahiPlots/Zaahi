"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { apiFetch } from "@/lib/api-fetch";
import { formatParcelStatus } from "@/lib/format-parcel-status";
import { useFormatArea } from "@/lib/area-unit";
import { useFormatPrice } from "@/lib/currency";

// ── Brand tokens (unified against login reference src/app/page.tsx).
const GOLD = "#C8A96E";
const PANEL_BG = "rgba(0, 0, 0, 0.3)";
const ROW_BG = "rgba(255, 255, 255, 0.03)";
const ROW_HOVER = "rgba(200, 169, 110, 0.10)";
const BORDER = "1px solid rgba(255, 255, 255, 0.15)";

type ParcelItem = {
  id: string;
  plotNumber: string;
  district: string;
  emirate: string;
  status: string;
  area: number;
  geometry: GeoJSON.Polygon | null;
  currentValuation: string | null;
  plan: { projectName?: string | null } | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  mapRef: React.RefObject<MLMap | null>;
  onSelectParcel: (id: string) => void;
};

// Display order for the status groups. This is a PREFERRED order, not a
// whitelist — see `grouped` below. /api/parcels/map returns LISTED /
// VERIFIED / IN_DEAL *and* the caller's own VAULT_PRIVATE rows (route.ts
// :52-57), so a hardcoded three-status list silently dropped every vault
// parcel from the list body while the header still counted it.
const STATUS_ORDER = ["LISTED", "VERIFIED", "IN_DEAL", "VAULT_PRIVATE"] as const;
const STATUS_COLOR: Record<string, string> = {
  LISTED: GOLD,
  VERIFIED: "#1B4965",
  IN_DEAL: "#2D6A4F",
  VAULT_PRIVATE: "#9B59B6",
};

export default function ParcelsPortalPanel({ open, onClose, mapRef, onSelectParcel }: Props) {
  const [items, setItems] = useState<ParcelItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const fetchedRef = useRef(false);

  // Lazy fetch — only on first open. The same endpoint is also loaded
  // inside loadZaahiPlots for the map source; we re-fetch separately so
  // this panel doesn't depend on the map-init lifecycle order.
  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;
    apiFetch("/api/parcels/map")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ items: ParcelItem[] }>;
      })
      .then((d) => setItems(d.items))
      .catch((e: Error) => {
        fetchedRef.current = false; // allow retry on next open
        setError(e.message || "Failed to load parcels");
      });
  }, [open]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      it.plotNumber.toLowerCase().includes(q)
      || it.district.toLowerCase().includes(q)
      || (it.plan?.projectName ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const grouped = useMemo(() => {
    const m = new Map<string, ParcelItem[]>();
    for (const it of filtered) {
      // Fall back to a visible bucket rather than dropping the row when a
      // parcel arrives with no status at all.
      const key = it.status || "OTHER";
      const arr = m.get(key) ?? [];
      arr.push(it);
      m.set(key, arr);
    }
    // Known statuses first, in STATUS_ORDER; anything else follows in
    // encounter order. A parcel is never silently discarded because its
    // status is missing from the display list — that was the root cause of
    // "No parcels match." on a fully loaded list.
    const known = STATUS_ORDER.filter((s) => (m.get(s)?.length ?? 0) > 0)
      .map((s) => ({ status: s as string, items: m.get(s)! }));
    const rest = [...m.keys()]
      .filter((k) => !STATUS_ORDER.includes(k as (typeof STATUS_ORDER)[number]))
      .map((k) => ({ status: k, items: m.get(k)! }));
    return [...known, ...rest];
  }, [filtered]);

  function handleClick(it: ParcelItem) {
    const map = mapRef.current;
    if (!map || !it.geometry) return;
    const centroid = polygonCentroid(it.geometry);
    if (!centroid) return;
    map.flyTo({
      center: centroid,
      zoom: 16,
      pitch: 45,
      duration: 2000,
      essential: true,
    });
    // Mirror HeaderBar Find (page.tsx:6155): wait for the flyTo to land
    // before popping the right SidePanel — otherwise the panel can race
    // a still-animating camera and the map jolt feels broken.
    window.setTimeout(() => onSelectParcel(it.id), 2000);
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        // Same anchor as the Layers panel (left:60, top:64) so the two
        // share visual language. Caller is expected to mutex the two so
        // they never overlap; ParcelsPortalPanel and Layers can't be
        // open at the same time.
        left: 60,
        top: 64,
        bottom: 96,                  // above the bottom rails (minimap)
        width: 360,
        background: PANEL_BG,
        backdropFilter: "blur(16px) saturate(140%)",
        WebkitBackdropFilter: "blur(16px) saturate(140%)",
        border: BORDER,
        borderLeft: `3px solid ${GOLD}`,
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
        zIndex: 12,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, padding: "12px 14px 10px", borderBottom: BORDER,
      }}>
        <span style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 14, fontWeight: 700, letterSpacing: "0.04em",
        }}>
          Parcels ({items?.length ?? "—"})
        </span>
        <button
          onClick={onClose}
          aria-label="Close parcels portal"
          style={{
            width: 24, height: 24, border: "none", borderRadius: 4,
            background: "transparent", color: GOLD, fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,169,110,0.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >×</button>
      </div>

      {/* Search */}
      <div style={{ padding: "8px 14px 10px", borderBottom: BORDER }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search plot, district, project…"
          style={{
            width: "100%",
            background: "rgba(255, 255, 255, 0.04)",
            border: BORDER,
            borderRadius: 4,
            color: "#fff",
            fontSize: 11,
            fontFamily: "inherit",
            padding: "6px 8px",
            outline: "none",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = GOLD; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        />
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
        {error && (
          <div style={{ padding: "16px 14px", fontSize: 11, color: "#E63946" }}>
            {error}
          </div>
        )}
        {!error && items === null && (
          <div style={{ padding: "16px 14px", fontSize: 11, opacity: 0.55 }}>
            Loading…
          </div>
        )}
        {/* Two distinct empty states — "loaded but nothing matches your
            query" vs "loaded and there is genuinely nothing here". The
            single "No parcels match." copy hid which one was happening. */}
        {!error && items !== null && grouped.length === 0 && (
          <div style={{ padding: "16px 14px", fontSize: 11, opacity: 0.55 }}>
            {search.trim()
              ? `No parcels match “${search.trim()}”.`
              : "No parcels available."}
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.status}>
            <div style={{
              padding: "10px 14px 4px", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.02em",
              color: STATUS_COLOR[group.status] ?? GOLD,
            }}>
              {formatParcelStatus(group.status)} ({group.items.length})
            </div>
            {group.items.map((it) => (
              <PortalCard key={it.id} item={it} onClick={() => handleClick(it)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PortalCard({ item, onClick }: { item: ParcelItem; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const fmtA = useFormatArea();
  const fmtP = useFormatPrice();
  const aed = item.currentValuation ? Math.floor(Number(item.currentValuation) / 100) : null;

  return (
    <button
      type="button"
      // Stable hook for the E2E smoke harness (tests/e2e/smoke.spec.ts) so
      // check (a) can count rendered rows against the header count without
      // depending on styling or copy.
      data-testid="portal-card"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block",
        width: "calc(100% - 16px)",
        margin: "4px 8px",
        textAlign: "left",
        background: hover ? ROW_HOVER : ROW_BG,
        border: `1px solid ${hover ? "rgba(200, 169, 110, 0.35)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 6,
        padding: "8px 10px",
        color: "#fff",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "border-color 150ms ease, background 150ms ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: GOLD,
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>
          {item.plotNumber}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
          padding: "1px 6px", borderRadius: 3,
          color: STATUS_COLOR[item.status] ?? GOLD,
          border: `1px solid ${(STATUS_COLOR[item.status] ?? GOLD)}55`,
          background: `${(STATUS_COLOR[item.status] ?? GOLD)}1A`,
        }}>
          {formatParcelStatus(item.status)}
        </span>
      </div>
      <div style={{ opacity: 0.7, fontSize: 12, marginTop: 2 }}>
        {item.district}
      </div>
      {item.plan?.projectName && (
        <div style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 11, marginTop: 3, opacity: 0.9,
        }}>
          {item.plan.projectName}
        </div>
      )}
      <div style={{
        display: "flex", justifyContent: "space-between", gap: 8,
        marginTop: 4, fontSize: 12, fontFamily: '"SF Mono", Menlo, monospace',
      }}>
        <span style={{ opacity: 0.6 }}>
          {item.area > 0 ? (fmtA(item.area, null) ?? "—") : "—"}
        </span>
        <span style={{ color: "rgba(255,255,255,0.95)", textAlign: "right" }}>
          {fmtP(aed) ?? "—"}
        </span>
      </div>
    </button>
  );
}

function polygonCentroid(g: GeoJSON.Polygon): [number, number] | null {
  const ring = g.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let lng = 0, lat = 0;
  for (const [x, y] of ring) { lng += x; lat += y; }
  return [lng / ring.length, lat / ring.length];
}
