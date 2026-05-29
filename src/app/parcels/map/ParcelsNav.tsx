"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { apiFetch } from "@/lib/api-fetch";

// ── Bottom-centre parcels nav pill ────────────────────────────────────
// Three controls in one row: ◀ prev | "Parcels (N)" toggle | next ▶.
// Replaces the 6th button on the left rail (founder spec 2026-05-29).
// Position mirrors the MiniMap dock's anchor (left:50% / transform
// translateX(-50%)) but sits 44 px higher so the two coexist — bottom:60
// vs MiniMap's bottom:16. ParcelsPortalPanel toggle, fetch, and flyTo
// pattern (zoom 16 / pitch 45 / 2 s) all match HeaderBar Find.

const GOLD = "#C8A96E";

type ParcelMini = {
  id: string;
  geometry: GeoJSON.Polygon | null;
};

type Props = {
  mapRef: React.RefObject<MLMap | null>;
  portalOpen: boolean;
  onTogglePortal: () => void;
  selectedParcelId: string | null;
  onSelectParcel: (id: string) => void;
};

export default function ParcelsNav({
  mapRef,
  portalOpen,
  onTogglePortal,
  selectedParcelId,
  onSelectParcel,
}: Props) {
  const [items, setItems] = useState<ParcelMini[] | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    // Defensive: read body as text first, then JSON.parse with explicit
    // try/catch + fallback. Earlier 500s on /api/parcels/map (P2022)
    // returned an HTML error page rather than JSON — calling r.json()
    // straight away threw "JSON.parse: unexpected end of data" with no
    // useful diagnostic. This path swallows that case gracefully.
    (async () => {
      try {
        const r = await apiFetch("/api/parcels/map");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        if (!text) throw new Error("empty body");
        let parsed: { items?: ParcelMini[] };
        try {
          parsed = JSON.parse(text);
        } catch {
          console.error("[ParcelsNav] /api/parcels/map returned non-JSON body:", text.slice(0, 120));
          throw new Error("invalid JSON");
        }
        setItems(parsed.items ?? []);
      } catch (err) {
        console.error("[ParcelsNav] fetch failed:", err);
        fetchedRef.current = false;
      }
    })();
  }, []);

  const currentIndex = useMemo(() => {
    if (!items || !selectedParcelId) return -1;
    return items.findIndex((p) => p.id === selectedParcelId);
  }, [items, selectedParcelId]);

  function goTo(direction: -1 | 1) {
    if (!items || items.length === 0) return;
    const baseIdx = currentIndex >= 0 ? currentIndex : 0;
    const next = (baseIdx + direction + items.length) % items.length;
    const target = items[next];
    if (!target?.geometry) return;
    const ring = target.geometry.coordinates[0];
    if (!ring || ring.length === 0) return;
    let lng = 0, lat = 0;
    for (const [x, y] of ring) { lng += x; lat += y; }
    lng /= ring.length;
    lat /= ring.length;
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [lng, lat],
      zoom: 16, pitch: 45, duration: 2000, essential: true,
    });
    // Mirror HeaderBar Find: wait for the camera to land before
    // popping the right SidePanel.
    window.setTimeout(() => onSelectParcel(target.id), 2000);
  }

  const count = items?.length ?? 0;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 60,
        transform: "translateX(-50%)",
        zIndex: 14,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          background: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: 999,
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
          color: "#FFFFFF",
          fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
          fontSize: 12,
          overflow: "hidden",
        }}
      >
        <NavArrow
          dir="prev"
          disabled={!items || items.length === 0}
          onClick={() => goTo(-1)}
        />
        {/* Middle clickable spacer — toggles the portal panel without
            rendering any "Parcels (N)" text label (founder spec
            2026-05-29 simplification). The element is empty + 16 px wide
            so the gap between the arrows stays clickable. */}
        <button
          type="button"
          aria-label={portalOpen ? "Close parcels list" : "Open parcels list"}
          title={`Parcels (${items === null ? "…" : count})`}
          onClick={onTogglePortal}
          style={{
            background: portalOpen ? "rgba(200,169,110,0.25)" : "transparent",
            border: "none",
            width: 16,
            padding: 0,
            cursor: "pointer",
            fontFamily: "inherit",
            borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
            borderRight: "1px solid rgba(255, 255, 255, 0.1)",
            transition: "background 150ms ease",
          }}
        />
        <NavArrow
          dir="next"
          disabled={!items || items.length === 0}
          onClick={() => goTo(1)}
        />
      </div>
    </div>
  );
}

function NavArrow({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === "prev" ? "Previous parcel" : "Next parcel"}
      title={dir === "prev" ? "Previous parcel" : "Next parcel"}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent",
        border: "none",
        color: disabled ? "rgba(255,255,255,0.3)" : "#FFFFFF",
        width: 36,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 600,
        transition: "background 150ms ease, color 150ms ease",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "rgba(200,169,110,0.20)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {dir === "prev" ? "◀" : "▶"}
    </button>
  );
}
