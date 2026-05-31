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
//
// Vault-aware navigation (founder spec 2026-05-31): the active set the
// arrows cycle through follows the lock direction —
//   lock OFF → public listings (isVault !== true)
//   lock ON  → caller's PPV    (isVault === true)
// When the lock flips, currentIndex on the new activeSet falls back to
// -1 (the previously-selected entry isn't in the new set), so the next
// arrow click starts from element 0 — exactly the founder-requested
// "reset to first on flip" behaviour, achieved through derived state
// alone (no extra useEffect).
//
// Routing: each item carries isVault + vaultEntryId so goTo can pop the
// correct SidePanel (vault adapter for PPV, public SidePanel for
// listings) via the split onSelectListing / onSelectVaultEntry callbacks.

type ParcelMini = {
  id: string;
  isVault: boolean;
  vaultEntryId: string | null;
  geometry: GeoJSON.Polygon | null;
};

type Props = {
  mapRef: React.RefObject<MLMap | null>;
  portalOpen: boolean;
  onTogglePortal: () => void;
  /** Currently selected public listing — drives currentIndex when lock OFF. */
  selectedParcelId: string | null;
  /** Currently selected vault entry id — drives currentIndex when lock ON. */
  selectedVaultEntryId: string | null;
  /** Vault-only mode (lock). Switches which set the arrows cycle through. */
  vaultOnlyMode: boolean;
  /** Open the public SidePanel for the given parcel id. */
  onSelectListing: (parcelId: string) => void;
  /** Open VaultSidePanelAdapter (owner mode) for the given vault entry id. */
  onSelectVaultEntry: (vaultEntryId: string) => void;
};

export default function ParcelsNav({
  mapRef,
  portalOpen,
  onTogglePortal,
  selectedParcelId,
  selectedVaultEntryId,
  vaultOnlyMode,
  onSelectListing,
  onSelectVaultEntry,
}: Props) {
  const [items, setItems] = useState<ParcelMini[] | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    apiFetch("/api/parcels/map")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: { items: ParcelMini[] }) => setItems(d.items))
      .catch(() => { fetchedRef.current = false; });
  }, []);

  // Active set follows the lock — listings vs caller's PPV. Recomputed
  // whenever the lock flips, so the arrows always cycle the visible set.
  const activeSet = useMemo<ParcelMini[]>(() => {
    if (!items) return [];
    return items.filter((p) => (vaultOnlyMode ? p.isVault : !p.isVault));
  }, [items, vaultOnlyMode]);

  // Current index inside the active set. When the lock just flipped,
  // the previous selection doesn't belong to the new set → returns -1,
  // and goTo falls back to baseIdx=0 (the first element of the new set).
  const currentIndex = useMemo(() => {
    if (activeSet.length === 0) return -1;
    if (vaultOnlyMode) {
      if (!selectedVaultEntryId) return -1;
      return activeSet.findIndex((p) => p.vaultEntryId === selectedVaultEntryId);
    }
    if (!selectedParcelId) return -1;
    return activeSet.findIndex((p) => p.id === selectedParcelId);
  }, [activeSet, vaultOnlyMode, selectedParcelId, selectedVaultEntryId]);

  function goTo(direction: -1 | 1) {
    if (activeSet.length === 0) return;
    const baseIdx = currentIndex >= 0 ? currentIndex : 0;
    const next = (baseIdx + direction + activeSet.length) % activeSet.length;
    const target = activeSet[next];
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
    // popping the right SidePanel. Vault entries open the vault
    // adapter; everything else opens the public SidePanel.
    window.setTimeout(() => {
      if (target.isVault && target.vaultEntryId) {
        onSelectVaultEntry(target.vaultEntryId);
      } else {
        onSelectListing(target.id);
      }
    }, 2000);
  }

  // "Parcels (N)" pill label reflects the active set (listings or PPV),
  // not the unfiltered total, so the user sees how many plots the
  // arrows will actually cycle through under the current lock.
  const count = activeSet.length;
  const navDisabled = activeSet.length === 0;

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
          disabled={navDisabled}
          onClick={() => goTo(-1)}
        />
        {/* Empty 16 px clickable spacer between ◀ and ▶ — toggles the
            portal panel without rendering any "Parcels (N)" label.
            Count + state survive as the aria-label / title so a screen
            reader and hover tooltip still surface them. */}
        <button
          type="button"
          aria-label={`${portalOpen ? "Close" : "Open"} parcels list — ${items === null ? "…" : count}`}
          title={
            items === null
              ? "Parcels (…)"
              : vaultOnlyMode
              ? `My vault plots (${count})`
              : `Listings (${count})`
          }
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
          disabled={navDisabled}
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
