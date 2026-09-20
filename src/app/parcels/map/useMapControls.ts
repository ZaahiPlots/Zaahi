"use client";
import { useMemo } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { sound } from "@/lib/sound";
import { apiFetch } from "@/lib/api-fetch";
import type { MapControls } from "@/lib/archie-tools";
import { EMPTY_FILTER_STATE, parcelStatusToUnified, type FilterState } from "@/lib/filter-state";
import type { BaseMap } from "./map-styles";
import { ZAAHI_PLOTS_GLOW, ZAAHI_PLOTS_GLOW_CRISP } from "./layers/ids";
import { LayersState } from "./layers/catalog";

export function useMapControls({
  mapRef,
  openParcelPanel,
  openVaultPanel,
  setAutoRotateEnabled,
  setBaseMap,
  setFilterState,
  setIs3D,
  setLayers,
  setLayersOpen,
  setLegendOpen,
  setSunSliderActive,
  setVaultOnlyMode,
}: {
  mapRef: React.RefObject<MLMap | null>;
  openParcelPanel: (id: string | null) => void;
  openVaultPanel: (entry: { id: string; mode: "owner" | "share" } | null) => void;
  setAutoRotateEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setBaseMap: React.Dispatch<React.SetStateAction<BaseMap>>;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  setIs3D: React.Dispatch<React.SetStateAction<boolean>>;
  setLayers: React.Dispatch<React.SetStateAction<LayersState>>;
  setLayersOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setLegendOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSunSliderActive: React.Dispatch<React.SetStateAction<boolean>>;
  setVaultOnlyMode: React.Dispatch<React.SetStateAction<boolean>>;
}): MapControls {
  // ── Archie mapControls bridge (Phase 2 archie client, 2026-05-30) ──
  // Imperative handles passed into ArchibaldChat so OpenAI tool_calls
  // can drive the map. All closures capture stable refs / setState
  // handles, so useMemo with empty deps gives a stable identity for
  // the lifetime of this component.
  return useMemo<MapControls>(() => ({
    flyTo: (lng, lat, zoom = 14) => {
      const m = mapRef.current;
      if (!m) return;
      m.flyTo({ center: [lng, lat], zoom, duration: 1200, essential: true });
    },
    fitBounds: (bounds) => {
      const m = mapRef.current;
      if (!m) return;
      m.fitBounds(bounds, { padding: 80, duration: 1200, maxZoom: 17 });
    },
    openParcel: (parcelId) => openParcelPanel(parcelId),
    openVaultEntry: (entryId) => openVaultPanel({ id: entryId, mode: "owner" }),
    highlightParcel: (parcelId) => {
      // Reuse the gold-glow filter pattern from the click-selection
      // path (page.tsx:307-312). Setting "__none__" hides the glow;
      // a real parcel id pulses the halo. NOTE we deliberately do
      // NOT touch ZAAHI_BUILDINGS_3D paint here — that grey-out
      // behaviour belongs to the click-selection flow alone.
      const m = mapRef.current;
      if (!m) return;
      const sel = parcelId ?? "__none__";
      if (m.getLayer(ZAAHI_PLOTS_GLOW)) {
        m.setFilter(ZAAHI_PLOTS_GLOW, ["==", ["id"], sel]);
      }
      if (m.getLayer(ZAAHI_PLOTS_GLOW_CRISP)) {
        m.setFilter(ZAAHI_PLOTS_GLOW_CRISP, ["==", ["id"], sel]);
      }
    },
    setVaultOnly: (enabled) => setVaultOnlyMode(enabled),
    filterByLandUse: (cat) => {
      // Wave 2: Archie's single-string land use input writes into the
      // multi-valued FilterState as a one-element array. Layer auto-
      // enable + reapplyMapFilters happen in the filterState sync
      // useEffect — single code path for both Archie and the panel.
      setFilterState((s) => ({ ...s, landUse: cat ? [cat] : [] }));
    },
    filterByStatus: (st) => {
      // Translate Archie's ParcelStatus → UnifiedStatus chip. When the
      // input is null, clear. When it's VAULT_PRIVATE (no UI chip;
      // covered by setVaultOnly), leave the existing status selection
      // untouched so the user's prior panel state isn't wiped.
      if (!st) {
        setFilterState((s) => ({ ...s, unifiedStatus: [] }));
        return;
      }
      const unified = parcelStatusToUnified(st);
      if (unified === null) return;
      setFilterState((s) => ({ ...s, unifiedStatus: [unified] }));
    },
    searchPlot: async (plotNumber) => {
      try {
        const r = await apiFetch(`/api/parcels/by-plot-number/${plotNumber}`);
        if (!r.ok) return null;
        const data = (await r.json()) as {
          exists: boolean;
          parcel?: {
            id: string;
            plotNumber: string;
            district: string;
            projectName: string | null;
            latitude: number | null;
            longitude: number | null;
            isVault: boolean;
            vaultEntryId: string | null;
          };
        };
        if (!data.exists || !data.parcel) return null;
        const p = data.parcel;
        return {
          id: p.id,
          plotNumber: p.plotNumber,
          district: p.district,
          latitude: p.latitude,
          longitude: p.longitude,
          projectName: p.projectName,
          isVault: p.isVault,
          vaultEntryId: p.vaultEntryId,
        };
      } catch {
        return null;
      }
    },
    resolveDistrict: async (name) => {
      try {
        const r = await apiFetch(
          `/api/archie/resolve-district?name=${encodeURIComponent(name)}`,
        );
        if (!r.ok) return null;
        return (await r.json()) as {
          name: string;
          matchedCount: number;
          matchMode: "exact" | "contains";
          center: [number, number];
          bounds: [[number, number], [number, number]] | null;
        };
      } catch {
        return null;
      }
    },
    // ── Wave 2 chrome / camera / overlay controls (founder spec 2026-06-01) ──
    // Each method shadows the rail-button handler so the LLM tools
    // produce the exact same on-screen effect as a manual click. The
    // return value echoes the post-call state so the chat can describe
    // what actually changed.
    setBaseMap: (theme) => {
      setBaseMap(theme);
    },
    setViewMode: (mode) => {
      const m = mapRef.current;
      const next3D = mode === "3D";
      setIs3D(next3D);
      sound.whoosh();
      if (m) m.easeTo({ pitch: next3D ? 45 : 0, duration: 400 });
    },
    zoomMap: (direction) => {
      const m = mapRef.current;
      if (!m) return;
      if (direction === "in") m.zoomIn();
      else m.zoomOut();
    },
    setSunSlider: (enabled) => {
      sound.whoosh();
      setSunSliderActive(enabled);
    },
    setAutoRotate: (enabled) => {
      sound.whoosh();
      setAutoRotateEnabled(enabled);
      return { autoRotate: enabled };
    },
    setLegendOpen: (open) => {
      setLegendOpen(open);
      if (open) setLayersOpen(false);
    },
    setLayer: (key, enabled) => {
      // Partial setLayers — the existing useEffect at L1957's setter
      // persists the new state to localStorage and triggers the
      // layer-attach reconciler. No need to touch reapplyMapFilters
      // here — toggle_layer drives overlay visibility, not the
      // ZAAHI listing layer's filters.
      setLayers((s) => ({ ...s, [key]: enabled }));
    },
    // ── Wave 3a additions (founder spec 2026-06-10) ──
    // Driven by the new control_filter + control_camera mega-tools in
    // src/lib/archie-tools.ts. Reuse the same setFilterState pattern as
    // the Wave 2 filterByLandUse / filterByStatus handlers above; no
    // sound effect on filter setters (matches FilterPanel debounce
    // behaviour — passive state update, not a punctual switch).
    setPriceRange: (min, max) => {
      setFilterState((s) => ({
        ...s,
        priceRange: min == null && max == null
          ? null
          : { min: min ?? 0, max: max ?? Number.POSITIVE_INFINITY },
      }));
    },
    setAreaRange: (min, max) => {
      setFilterState((s) => ({
        ...s,
        areaRange: min == null && max == null
          ? null
          : { min: min ?? 0, max: max ?? Number.POSITIVE_INFINITY },
      }));
    },
    resetAllFilters: () => {
      // Same reset path the FilterPanel "Reset all" button uses
      // (page.tsx:6125). Single source of truth for "clear everything".
      setFilterState(EMPTY_FILTER_STATE);
    },
    flyToEmirate: (emirate) => {
      // Overview camera presets per CLAUDE.md DEPLOYMENT region. Zoom 9.5
      // frames each emirate's footprint without cropping the coast.
      const m = mapRef.current;
      if (!m) return;
      const EMIRATE_CENTERS = {
        DUBAI:     { lng: 55.27, lat: 25.20, zoom: 9.5 },
        ABU_DHABI: { lng: 54.37, lat: 24.45, zoom: 9.5 },
      } as const;
      const c = EMIRATE_CENTERS[emirate];
      m.flyTo({ center: [c.lng, c.lat], zoom: c.zoom, duration: 1500, essential: true });
    },
    // openParcelPanel / openVaultPanel are useCallback([]) — stable for the
    // lifetime of the component, so this memo still never recomputes.
  }), [openParcelPanel, openVaultPanel]);
}
