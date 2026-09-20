"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MLMap, MapMouseEvent, FilterSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";
import { LightingEffect, AmbientLight, DirectionalLight } from "@deck.gl/core";
import SidePanel from "./SidePanel";
import ArchibaldChat from "./ArchibaldChat";
import { VaultSidePanelAdapter } from "./VaultSidePanelAdapter";
import {
  PANEL_WIDTH_DEFAULT,
  PANEL_WIDTH_STORAGE_KEY,
  clampPanelWidth,
} from "./sidepanel-width";
import { useFormatArea } from "@/lib/area-unit";
import { useFormatPriceShort } from "@/lib/currency";
import WelcomeTour from "./WelcomeTour";
import AddPlotModal from "./AddPlotModal";
import { AddPlotChooser } from "./AddPlotChooser";
import { AddPlotWizardModal } from "./AddPlotWizardModal";
// MiniMap dock unmounted 2026-06-01 (founder spec). The component
// file is kept in place for the future panel-control overview;
// no current consumer.
import SunTimeSlider from "./SunTimeSlider";
import { useSunLight } from "./useSunLight";
import MapZoomReadout from "./MapZoomReadout";
import MapCoordsReadout from "./MapCoordsReadout";
import TermsAcceptModal from "./TermsAcceptModal";
import BuildingCard from "./buildings/BuildingCard";
import { useBuildingsLayer, flyToBuilding } from "./buildings/useBuildingsLayer";
import type { BuildingDTO } from "./buildings/types";
import { sound } from "@/lib/sound";
import { useProactiveArchie } from "@/lib/use-proactive-archie";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/lib/api-fetch";
import { EMPTY_FILTER_STATE, countActiveFilters, unifiedToPmtilesStatusList, unifiedToZaahiStatusList, type FilterState, type UnifiedStatus } from "@/lib/filter-state";
import FilterPanel from "./FilterPanel";
import { installAutoRotate, type AutoRotateController } from "@/lib/auto-rotate";
import { installKeyboardNav, type KeyboardNavController } from "@/lib/keyboard-nav";
import { emitSignatureTiers, type SetbackEntry } from "@/lib/zaahi-3d-tiers";
import {
  installArchetypeLayer,
  type ArchetypeBuildingInput,
  type ArchetypeLayerController,
} from "@/lib/archetypes/archetype-layer";
import { BaseMap, PALETTE, STYLES, Theme } from "./map-styles";
import { AD_COMM_FILL, AD_COMM_LINE, AD_COMM_SRC, AD_DIST_FILL, AD_DIST_LINE, AD_DIST_SRC, AD_MUN_FILL, AD_MUN_LINE, AD_MUN_SRC, COMMUNITIES_FILL, COMMUNITIES_LINE, COMMUNITIES_SRC, D11_LINE, D11_SRC, DDA_FZ_FILL, DDA_FZ_LINE, DDA_FZ_SRC, DDA_PROJ_FILL, DDA_PROJ_LINE, DDA_PROJ_SRC, DISTRICT_NAMES_LAYER, DISTRICT_NAMES_SRC, EV_CHARGERS_SRC, EV_CHARGERS_SYMBOL, FURJAN_LINE, FURJAN_SRC, IC23_LINE, IC23_SRC, ISLANDS_LINE, ISLANDS_SRC, MARINE_STATIONS_SRC, MARINE_STATIONS_SYMBOL, METRO_LINE, METRO_SRC, METRO_STATIONS_SRC, METRO_STATIONS_SYMBOL, MEYDAN_LINE, MEYDAN_SRC, NAD_AL_HAMMER_LINE, NAD_AL_HAMMER_SRC, RES12_LINE, RES12_SRC, ROADS_LINE, ROADS_SRC, TRAM_STATIONS_SRC, TRAM_STATIONS_SYMBOL, UAE_DIST_FILL, UAE_DIST_LINE, UAE_DIST_SRC, VAULT_CONFLICT_MARKERS_LAYER, VAULT_CONFLICT_MARKERS_SRC, VAULT_SHARED_3D, VAULT_SHARED_SRC, ZAAHI_BUILDINGS_3D, ZAAHI_BUILDINGS_SRC, ZAAHI_PLOTS_FILL, ZAAHI_PLOTS_GLOW, ZAAHI_PLOTS_GLOW_CRISP, ZAAHI_PLOTS_LINE, ZAAHI_PLOTS_SRC } from "./layers/ids";
import { ZAAHI_DEFAULT_COLOR, ZAAHI_LANDUSE_COLOR, deriveLandUse } from "./land-use";
import { applySelectionPaint, bindLayerEvent, ringCentroid } from "./map-events";
import { CATEGORY_LABELS, COUNTRY_LABELS, DDA_LAYERS, LAYER_CATEGORY_ORDER, LAYER_COUNTRY_ORDER, LAYER_META, LayerCategory, LayerCountry, LayerLockTier, LayersState, ddaLabelId, detectCountryFromLngLat } from "./layers/catalog";
import { loadSavedLayers, loadSavedMapView, loadVaultOnlyMode, saveLayers, saveMapView } from "./layers/persistence";

// research/landuse-archetypes — `?archetypes=1` renders ZAAHI listings as
// per-land-use morphology massing via a Three.js CustomLayer. Default off →
// prod unchanged. The flag is read LIVE from window.location.search inside
// loadZaahiPlots (+ localStorage fallback seeded at mount) — never via a
// memo/SSR value, per the Signature §10 stale-flag lesson.
// LOD: the residential Three.js massing only renders at/above this zoom. Below
// it the archetype is hidden and residential falls back to the normal
// fill-extrusion (no double-render, no far-zoom perspective overhang).
const ARCHETYPE_MIN_ZOOM = 14;

// VARIANT A (2026-06-13): on a Vercel PREVIEW deployment the SSO auth redirect
// strips `?archetypes=1` before React mounts, so the query never survives. So on
// preview hosts the archetype massing defaults ON (no flag needed) for review.
// PROD stays hard-OFF: the allow-list matches ONLY the auto-generated preview
// hostnames `*-zaahiplots-projects.vercel.app` — never the prod aliases
// zaahi.io / www.zaahi.io / zaahi.vercel.app. `?archetypes=0` / the Layers
// toggle (Variant B) override via localStorage.
function isArchetypePreviewHost(): boolean {
  try {
    return window.location.hostname.endsWith("-zaahiplots-projects.vercel.app");
  } catch {
    return false;
  }
}

/** localStorage key backing the Layers-panel archetype toggle (Variant B). */
const ARCHETYPE_STORAGE_KEY = "zaahi-archetypes";

/**
 * Single source of truth for the archetype flag. Both the Layers-panel toggle's
 * initial state and loadZaahiPlots read THIS — splitting the two is the
 * Signature §10 stale-flag class of bug the branch already fought once.
 *
 * Precedence: explicit `?archetypes=1/0` → localStorage (the Layers toggle) →
 * preview-host default ON → prod OFF. The query can't be relied on (Vercel SSO
 * strips it before React mounts) so it's only the top override.
 */
function resolveArchetypeFlag(): { on: boolean; via: string } {
  try {
    const search =
      typeof window !== "undefined" && window.location ? window.location.search : "";
    const v = new URLSearchParams(search).get("archetypes");
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(ARCHETYPE_STORAGE_KEY); } catch { /* ignore */ }
    if (v === "1") {
      try { window.localStorage.setItem(ARCHETYPE_STORAGE_KEY, "1"); } catch { /* ignore */ }
      return { on: true, via: "query-on" };
    }
    if (v === "0") {
      try { window.localStorage.setItem(ARCHETYPE_STORAGE_KEY, "0"); } catch { /* ignore */ }
      return { on: false, via: "query-off" };
    }
    if (stored === "1") return { on: true, via: "localStorage-on" };
    if (stored === "0") return { on: false, via: "localStorage-off" };
    const preview = isArchetypePreviewHost();
    return { on: preview, via: preview ? "preview-default-ON" : "prod-default-OFF" };
  } catch {
    return { on: false, via: "error-default-OFF" };
  }
}
import {
  HERO_BUILDINGS,
  HERO_OVERRIDES_STORAGE_KEY,
  effectiveValues,
  type HeroOverride,
} from "./heroBuildingsRegistry";
import HeroBuildingsDevPanel from "./HeroBuildingsDevPanel";
import ParcelsPortalPanel from "./ParcelsPortalPanel";
import ParcelsNav from "./ParcelsNav";
// Phase 1 style unification (2026-05-31): Layers panel migrated to
// the shared Panel + token foundation as the first proof point.
// Other surfaces (HeaderBar, hover popups, MiniMap dock, SidePanel)
// follow in the next commit after founder review.
import { Panel } from "@/components/Panel";
import { debugLog, debugWarn } from "@/lib/debug";
import { PANEL_BG, PANEL_BLUR, RADIUS_PANEL, RADIUS_CARD } from "@/lib/design-tokens";
import { PmtilesHoverRow, VaultAddButton, formatPlanDate, formatPmtilesStatus } from "./HoverCardParts";
import { CountryGroup, LayerGroup, LayerToggle } from "./LayersPanelParts";
import { HeaderBar } from "./HeaderBar";
import { MapToast, Toast } from "./MapToast";
import { AutoRotateHint, MapLeftRail, MapRightRail } from "./MapRails";
import { ContextLostOverlay } from "./ContextLostOverlay";
import { LandUseLegend } from "./LandUseLegend";
import { useMapControls } from "./useMapControls";

const GOLD = "#C8A96E";
function ParcelsMapPageInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  // ?archetypes=1 — Three.js morphology CustomLayer controller (lazily
  // installed inside loadZaahiPlots). Null when the flag is off.
  const archetypeCtrlRef = useRef<ArchetypeLayerController | null>(null);
  // True while the residential archetype layer is active (preview/flag). Used
  // so reapplyMapFilters keeps residential excluded from the fill-extrusion.
  const archetypeActiveRef = useRef<boolean>(false);
  // Layers-panel toggle state (Variant B). Mirrors resolveArchetypeFlag() so
  // the checkbox reflects whatever loadZaahiPlots actually applied. Starts
  // false on the server and is reconciled at mount — reading localStorage in
  // the initialiser would desync SSR and client HTML.
  const [archetypesOn, setArchetypesOn] = useState(false);
  // Seed the archetypes flag at mount, when window.location.search is freshest
  // (before any auth/SSO redirect can strip the query, and before
  // loadZaahiPlots reads it). Persisted to localStorage so the flag survives
  // the redirect dance. `?archetypes=0` turns it off again.
  useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get("archetypes");
      if (v === "1") window.localStorage.setItem(ARCHETYPE_STORAGE_KEY, "1");
      else if (v === "0") window.localStorage.removeItem(ARCHETYPE_STORAGE_KEY);
      debugLog("[ZAAHI archetypes] mount seed: search=", JSON.stringify(window.location.search), "· stored=", window.localStorage.getItem(ARCHETYPE_STORAGE_KEY));
      setArchetypesOn(resolveArchetypeFlag().on);
    } catch { /* ignore */ }
  }, []);
  // Layers-panel toggle handler. Persists the choice, then re-runs
  // loadZaahiPlots: turning the flag ON from a cold prod session has no
  // controller yet (installArchetypeLayer sits behind the `if (arFlag)` gate)
  // and archetypeInputs are computed inside loadZaahiPlots, so a re-run is the
  // only way to install + feed the layer. Turning it OFF falls into the new
  // else-branch there, which tears the overlay down and restores Signature.
  const handleArchetypesToggle = (next: boolean) => {
    setArchetypesOn(next);
    try {
      window.localStorage.setItem(ARCHETYPE_STORAGE_KEY, next ? "1" : "0");
    } catch { /* ignore */ }
    const map = mapRef.current;
    if (map) void loadZaahiPlots(map);
  };
  // Private Plot Vault — side panel state. Owner-side: set by the
  // ZAAHI_PLOTS_FILL click handler via the isVault branch (Phase 3
  // unification). Share-side: set by the VAULT_SHARED_3D click handler.
  //
  // MUTUALLY EXCLUSIVE with selectedParcelId. Both drive a right-edge
  // <aside> of the same (user-resizable) width. When both were non-null
  // the two panels tiled side by side and covered ~85% of the viewport,
  // and closing one left the other swallowing every pointer event over
  // the map — recoverable only by reload. The map click handler already
  // routed one XOR the other, but the carousel / parcels list / hover
  // card / Archie tool entry points each set their own atom without
  // clearing the sibling. Always go through openParcelPanel /
  // openVaultPanel below rather than calling the setters directly.
  const [selectedVaultEntry, setSelectedVaultEntry] = useState<
    { id: string; mode: "owner" | "share" } | null
  >(null);
  // Panel mutex. Opening either side panel closes the other.
  const openParcelPanel = useCallback((id: string | null) => {
    setSelectedParcelId(id);
    if (id !== null) setSelectedVaultEntry(null);
  }, []);
  const openVaultPanel = useCallback(
    (entry: { id: string; mode: "owner" | "share" } | null) => {
      setSelectedVaultEntry(entry);
      if (entry !== null) setSelectedParcelId(null);
    },
    [],
  );
  // SidePanel drag-resize width (founder spec 2026-05-31). Lives in
  // page.tsx so the value survives open/close cycles and stays in
  // sync between SidePanel + VaultSidePanelAdapter. Initialised to
  // PANEL_WIDTH_DEFAULT to avoid an SSR/CSR mismatch — the useEffect
  // below restores the saved value on mount, before the panel ever
  // opens (selectedParcelId is null at first paint), so no flicker.
  // Area unit (ft² vs m²) — subscribes to the dashboard Settings →
  // Area Unit toggle. Internal storage stays sqft per CLAUDE.md;
  // this only formats display.
  const fmtA = useFormatArea();
  // Currency (AED vs USD) — subscribes to dashboard Settings →
  // Currency toggle. Short variant for hover popups where the
  // headline matters more than the exact digits.
  const fmtPShort = useFormatPriceShort();
  const [panelWidth, setPanelWidthState] = useState<number>(PANEL_WIDTH_DEFAULT);
  const panelWidthWriteRef = useRef<number | null>(null);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY);
      if (raw != null) {
        const n = Number(raw);
        if (Number.isFinite(n)) {
          setPanelWidthState(clampPanelWidth(n, window.innerWidth));
        }
      }
    } catch { /* localStorage unavailable — keep default */ }
  }, []);
  const setPanelWidth = useCallback((w: number) => {
    setPanelWidthState(w);
    // Debounce the localStorage write so a 60 fps drag doesn't pound
    // synchronous storage on every move. Latest value wins.
    if (panelWidthWriteRef.current != null) {
      window.clearTimeout(panelWidthWriteRef.current);
    }
    panelWidthWriteRef.current = window.setTimeout(() => {
      try { window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(w)); }
      catch { /* ignore quota errors */ }
      panelWidthWriteRef.current = null;
    }, 100);
  }, []);
  // sound.init() is called from inside HeaderBar's local useEffect now
  // (the music toggle button lives there). The page-level state used
  // to live here for the old floating button which was removed.

  // PMTiles protocol is registered in the map init useEffect below.

  // ── Selection highlight: glow + dim others + 3D building boost ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.isStyleLoaded()) {
      // Wait for first render before painting expressions on freshly-added layers.
      const onLoad = () => applySelectionPaint(map, selectedParcelId);
      map.once("idle", onLoad);
      return () => { map.off("idle", onLoad); };
    }
    applySelectionPaint(map, selectedParcelId);
    if (selectedParcelId == null) return;

    // Pulse animation for the crisp gold outline (line-width 2 → 4 → 2)
    let raf = 0;
    const t0 = performance.now();
    const tick = () => {
      const map2 = mapRef.current;
      if (!map2 || !map2.getLayer(ZAAHI_PLOTS_GLOW_CRISP)) return;
      const t = (performance.now() - t0) / 1000;
      // 1.5s period, smooth sin oscillation between 2 and 4
      const w = 3 + Math.sin((t * Math.PI * 2) / 1.5);
      try {
        map2.setPaintProperty(ZAAHI_PLOTS_GLOW_CRISP, "line-width", w);
      } catch {
        /* layer not ready yet */
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selectedParcelId]);

  // Record a ParcelView whenever the user opens a parcel (SidePanel
  // becomes visible). The API throttles at 30s per (user, parcel) so
  // re-opens don't inflate counts. Self-views are filtered out on the
  // server. Best-effort — never blocks the UI.
  useEffect(() => {
    if (!selectedParcelId) return;
    void apiFetch(`/api/parcels/${selectedParcelId}/view`, { method: "POST" }).catch(() => { /* silent */ });
  }, [selectedParcelId]);

  // Defer-close timer so the user can move the cursor from the polygon
  // onto the (now clickable) hover card without it disappearing first.
  const hoverCloseTimerRef = useRef<number | null>(null);
  const [zaahiHover, setZaahiHover] = useState<{
    x: number;
    y: number;
    id: string;
    lng: number;
    lat: number;
    plotNumber: string;
    district: string;
    emirate: string;
    area: number;
    priceAed: number | null;
    landUse: string;
    projectName: string;
    plotAreaSqm: number;
    plotAreaSqft: number;
    maxGfaSqm: number;
    maxGfaSqft: number;
    maxFloors: number;
    maxHeightMeters: number;
    maxHeightCode: string;
    far: number;
    planDateIso: string;
  } | null>(null);
  // Vault hover popup — mirrors zaahiHover so a vault polygon reads
  // the same as a public listing on hover. Click → VaultSidePanelAdapter
  // (via setSelectedVaultEntry), same handshake as ZAAHI listings.
  const [vaultHover, setVaultHover] = useState<{
    x: number;
    y: number;
    id: string;
    plotNumber: string;
    district: string;
    landUse: string;
    projectName: string;
    askingAed: number | null;
    area: number;
    plotAreaSqft: number;
    maxGfaSqft: number;
    maxFloors: number;
    maxHeightMeters: number;
    maxHeightCode: string;
    far: number;
    planDateIso: string;
    mode: "owner" | "share";
  } | null>(null);
  const [ddaLandHover, setDdaLandHover] = useState<{
    x: number; y: number;
    plotNumber: string;
    mainLandUse: string;
    areaSqm: number; areaSqft: number;
    gfaSqm: number; gfaSqft: number;
    status: string;
    source: "dda" | "ad" | "";
    municipality: string;
    district: string;
  } | null>(null);

  // When either SidePanel opens, drop the residual hover card state +
  // any shared maplibre boundary popup. The JSX render is already gated
  // on !selectedParcelId && !selectedVaultEntry (see the hover popup
  // blocks below the style block), but clearing state too keeps DevTools
  // tidy and prevents a flash if the panel closes while the cursor is
  // still on the same polygon.
  useEffect(() => {
    if (!selectedParcelId && !selectedVaultEntry) return;
    setZaahiHover(null);
    setVaultHover(null);
    setDdaLandHover(null);
    if (hoverCloseTimerRef.current != null) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    popupRef.current?.remove();
  }, [selectedParcelId, selectedVaultEntry]);
  // Split plotNumber index for PMTiles exclusion (founder spec 2026-05-31,
  // symmetric revision later the same day). Each ref holds one side of
  // the ZAAHI source — listings and the caller's PPV — so the PMTiles
  // exclusion filter can swap direction with the vault-only lock:
  // exclude only what ZAAHI is currently rendering, let PMTiles paint
  // the other side as background. See applyZaahiExclusionToTileLayers
  // below for the full rationale (including why showing a vault plot
  // as a PMTiles background polygon is not a privacy leak — the plot
  // itself is public DDA data; only the vault metadata is gated).
  const zaahiListingPnRef = useRef<Set<string>>(new Set());
  const zaahiVaultPnRef = useRef<Set<string>>(new Set());
  const mapRef = useRef<MLMap | null>(null);
  // deck.gl MapboxOverlay carrying the spike's hero GLB. Created
  // inside the map-init effect after the map instance is ready,
  // torn down in that effect's cleanup. See HERO_GLB_URL above.
  const deckOverlayRef = useRef<MapboxOverlay | null>(null);
  // Lazy-load gate: hero GLBs are only loaded into deck.gl when user is
  // zoomed in (zoom ≥ 14). Saves bandwidth + WebGL memory on initial paint.
  const [glbActive, setGlbActive] = useState(false);
  // True once the deferred MapboxOverlay has been .addControl()-ed.
  // Needed because deckOverlayRef is a ref and won't trigger sync re-run.
  const [overlayReady, setOverlayReady] = useState(false);
  // ── 3D hero buildings — dev-mode tuning panel ──
  // Activated via ?dev=1 in URL. Clicking any hero (deck.gl pickable)
  // opens HeroBuildingsDevPanel for that building. Overrides persist
  // to localStorage; founder later pastes Copy Config into the registry.
  const [devModeHero, setDevModeHero] = useState(false);
  const [editingHeroId, setEditingHeroId] = useState<string | null>(null);
  const [heroOverrides, setHeroOverrides] = useState<Record<string, HeroOverride>>({});
  useEffect(() => {
    setDevModeHero(new URLSearchParams(window.location.search).get("dev") === "1");
    try {
      const raw = localStorage.getItem(HERO_OVERRIDES_STORAGE_KEY);
      if (raw) setHeroOverrides(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(HERO_OVERRIDES_STORAGE_KEY, JSON.stringify(heroOverrides));
    } catch { /* noop */ }
  }, [heroOverrides]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  // Digital-twin Buildings layer state — completely additive, isolated
  // from the ZAAHI Signature rendering for LISTED plots.
  const [mapStyleReady, setMapStyleReady] = useState(false);
  // Raised at the END of map.on("load"), once every overlay/land layer
  // exists. mapStyleReady goes up at the top of the handler — too early
  // for effects that write visibility onto layers.
  const [overlaysReady, setOverlaysReady] = useState(false);
  const [completedVisible, setCompletedVisible] = useState(true);
  const [underConstructionVisible, setUnderConstructionVisible] = useState(true);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const buildingsStatusFilter = useMemo<BuildingDTO["status"][]>(() => {
    const f: BuildingDTO["status"][] = [];
    if (completedVisible) f.push("COMPLETED");
    if (underConstructionVisible) f.push("UNDER_CONSTRUCTION");
    return f;
  }, [completedVisible, underConstructionVisible]);
  const buildingsEnabled = buildingsStatusFilter.length > 0;
  // Ref mirror of the fetched list so the MapLibre click handler always
  // sees the latest items without needing hook re-registration.
  const loadedBuildingsRef = useRef<BuildingDTO[]>([]);
  const { buildings: loadedBuildings } = useBuildingsLayer({
    mapRef,
    mapReady: mapStyleReady,
    enabled: buildingsEnabled,
    statusFilter: buildingsStatusFilter,
    onSelectBuilding: (id) => {
      setSelectedBuildingId(id);
      const map = mapRef.current;
      const b = loadedBuildingsRef.current.find((x) => x.id === id);
      if (map && b) flyToBuilding(map, b);
    },
  });
  loadedBuildingsRef.current = loadedBuildings;
  const [theme, setTheme] = useState<Theme>("light");
  // Live mirror of `baseMap` for the map-init effect, which has [] deps and
  // would otherwise close over the mount-time value. Read by the
  // webglcontextrestored handler (perf-2026-08-21 item 5) to rebuild the
  // style the user is actually looking at, not the one they loaded with.
  const baseMapRef = useRef<BaseMap>("light");
  const [baseMap, setBaseMap] = useState<BaseMap>("light");
  baseMapRef.current = baseMap;
  // WebGL context loss. Set by the canvas `webglcontextlost` handler in the
  // map-init effect; drives the recovery overlay near the bottom of the JSX.
  const [contextLost, setContextLost] = useState(false);
  // Throttle basemap swaps so impatient clicking can't queue multiple
  // setStyle()s while the previous styledata handler is still loading
  // (founder fix 2026-06-03 — companion to the listener-leak fix in
  // attachOverlays). Each setStyle re-binds listeners and re-fetches
  // tiles; bursting 3 swaps in 100 ms used to compound the leak before
  // bindLayerEvent ran.
  const [baseMapBusy, setBaseMapBusy] = useState(false);
  // ── Founder backlog #13 — search beyond the ZAAHI listings ──────────
  //
  // "Find plot" only ever searched the rows behind /api/parcels/map. The map
  // also renders the DDA + Abu Dhabi land registry from PMTiles, and typing
  // one of those plot numbers returned "No plot found" — which was false: the
  // plot is on screen.
  //
  // This is a VIEWPORT search, deliberately. querySourceFeatures only sees
  // tiles MapLibre has already loaded, so it cannot answer for a whole
  // emirate. The error message says so rather than implying a global index
  // exists. A real global search needs a server-side plot_number -> centroid
  // table over the registry; that is a separate task, in docs/BACKLOG.md.
  //
  // Returns a centroid, or null when nothing in the loaded tiles matches.
  const findPlotInTiles = useCallback((plotNumber: string): { lng: number; lat: number } | null => {
    const map = mapRef.current;
    if (!map) return null;
    const raw = plotNumber.trim();
    const needle = raw.toLowerCase();
    if (!needle) return null;
    for (const srcId of [DDA_LAND_TILES_SRC, AD_ADM_TILES_SRC, AD_OTHER_TILES_SRC]) {
      if (!map.getSource(srcId)) continue;
      let feats: GeoJSON.Feature[] = [];
      try {
        feats = map.querySourceFeatures(srcId, {
          sourceLayer: "plots",
          filter: ["==", ["to-string", ["get", "plotNumber"]], raw],
        }) as unknown as GeoJSON.Feature[];
      } catch {
        // querySourceFeatures throws mid-style-swap — same guard the
        // ZAAHI-exclusion path uses. A miss here is not an error.
        continue;
      }
      // The filter is exact; re-check normalised in case a tile carries
      // padding or different case, which the free-text field allows.
      const hit =
        feats.find(
          (f) => String(f.properties?.plotNumber ?? "").trim().toLowerCase() === needle,
        ) ?? feats[0];
      if (!hit) continue;
      // Vector tiles fragment polygons at tile boundaries, so a feature may
      // arrive as Polygon or MultiPolygon. Average the outer ring either way
      // — precision beyond "fly here" is not needed.
      const g = hit.geometry;
      let ring: number[][] | null = null;
      if (g?.type === "Polygon") ring = g.coordinates[0] as number[][];
      else if (g?.type === "MultiPolygon") ring = (g.coordinates[0]?.[0] as number[][]) ?? null;
      if (!ring || ring.length === 0) continue;
      const lng = ring.reduce((acc, q) => acc + q[0], 0) / ring.length;
      const lat = ring.reduce((acc, q) => acc + q[1], 0) / ring.length;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      return { lng, lat };
    }
    return null;
  }, []);

  const swapBaseMap = useCallback((target: BaseMap) => {
    if (baseMapBusy) return;
    setBaseMap((current) => {
      if (current === target) return current;
      setBaseMapBusy(true);
      window.setTimeout(() => setBaseMapBusy(false), 600);
      return target;
    });
  }, [baseMapBusy]);
  const [is3D, setIs3D] = useState(true);
  // zoom / bearing React-state mirrors removed 2026-06-11 (perf fix
  // on feat/keyboard-nav). MapLibre's "zoom"/"rotate" events fire
  // ~60 Hz under keyboard nav and the setState chain was forcing a
  // full MapPage re-render every frame. The two surviving consumers
  // (coord-overlay zoom readout, compass-icon rotation) now live in
  // MapZoomReadout + MapCompassIcon, each with its own rAF loop +
  // direct DOM mutation. See git log for grep confirming no other
  // consumers existed.
  // "+" on the map opens a chooser (Listing vs Vault), then routes to the
  // selected flow. Per founder direction: Cancel/×/Esc/backdrop inside
  // either inner flow returns to the chooser; the chooser's own ×/Esc/
  // backdrop returns to the map. Two-step exit is intentional — keeps
  // AddPlotModal / AddPlotWizard internal logic untouched.
  type AddFlow = "none" | "chooser" | "listing" | "vault";
  const [addFlow, setAddFlow] = useState<AddFlow>("none");
  // Pre-filled plot number passed into AddPlotWizardModal when the
  // "+ Add to Vault" button on a hover popup opens the wizard.
  // Cleared whenever the add flow closes so the next manual open
  // (HeaderBar + button → chooser → vault) starts with an empty form.
  const [addPlotPrefill, setAddPlotPrefill] = useState<string | null>(null);

  // Shared entry point for both hover-card "+ Add to Vault" buttons
  // (ZAAHI listings + PMTiles parcels). Validates the plot number,
  // closes any open hover popup, then opens the wizard with the plot
  // pre-filled so Step 1 fires its mount-only lookup automatically.
  //
  // No inline auth gate — the page is wrapped in <AuthGuard>, and the
  // HeaderBar "+" button (onOpenAddModal) doesn't probe either. The
  // earlier inline check was inherited from a legacy code path that
  // looked for the Supabase v1 storage keys ("sb-…" cookie +
  // "supabase.auth.token" localStorage). Supabase v2 stores the
  // session under "sb-<projectref>-auth-token" instead, so both probes
  // failed for every authenticated user and the redirect to "/"
  // misfired on every click of the new "+" hover button.
  function openVaultWizardWith(plotNumber: string) {
    if (!plotNumber.match(/^\d{5,10}$/)) return;
    setZaahiHover(null);
    setDdaLandHover(null);
    setVaultHover(null);
    setAddPlotPrefill(plotNumber);
    setAddFlow("vault");
  }

  // Lightweight toast for success / error feedback after wizard or listing
  // submit. Single slot — newer toast replaces older. Auto-dismiss after 4s,
  // user can dismiss manually via ×.
  const [toast, setToast] = useState<Toast | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);
  // Sun-time override — null means "use real wall-clock time" so the
  // shadow direction tracks live; a Date overrides it to the slider's
  // chosen hour-of-today. Passed straight into useSunLight which calls
  // map.setLight() whenever this changes (or once per minute on the
  // live path). Gate on mapStyleReady so the first setLight call lands
  // *after* the style has loaded — otherwise it's a silent no-op.
  //
  // Founder spec 2026-05-23: default override at 08:15 (warm dawn-
  // shadow look that reads best against Dubai glass). The ☀ button
  // starts active so the slider is visible on first load.
  const [sunTimeOverride, setSunTimeOverride] = useState<Date | null>(() => {
    const d = new Date();
    d.setHours(8, 15, 0, 0);
    return d;
  });
  // Sun-time slider visibility — gated by the ☀ button in the right
  // stack. The toggle controls UI visibility only; the directional
  // light is always on via useSunLight below (gated solely on
  // mapStyleReady). Default closed so users land on a clean map;
  // the 08:15 sun is already lighting the scene, just without slider
  // chrome on screen. Click ☀ to reveal the slider, click again
  // to hide. Double-clicking the slider is the way to clear back to
  // live wall-clock time.
  const [sunSliderActive, setSunSliderActive] = useState(false);
  useSunLight(mapRef, { overrideDate: sunTimeOverride, enabled: mapStyleReady });
  // Drive the archetype CustomLayer's directional sun from the SAME override the
  // sun slider feeds MapLibre's native light → archetypes self-shadow + react to
  // the sun toggle exactly like the fill-extrusion 3D (founder 2026-06-15).
  useEffect(() => {
    archetypeCtrlRef.current?.setSun(sunTimeOverride);
  }, [sunTimeOverride, mapStyleReady]);

  // 2026-06-10 (founder backlog follow-up): live count of vault entries
  // OTHER users have shared with the caller. Drives the "Shared with me"
  // category in the Layers panel — when the count is a definite zero,
  // the whole category is hidden so the panel doesn't dangle an empty
  // toggle. null = still loading (fetch fires once on mount); we keep
  // the category visible with a "(…)" placeholder during that window
  // so a slow connection doesn't flash a missing section.
  const [sharedVaultCount, setSharedVaultCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await apiFetch("/api/vault/shared-with-me?limit=1");
        if (!r.ok) return;
        const data = (await r.json()) as { total?: number };
        if (!cancelled && typeof data.total === "number") {
          setSharedVaultCount(data.total);
        }
      } catch {
        /* silent — non-critical UI count */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Vault-only map mode — when ON, only caller's VAULT_PRIVATE plots
  // render on the ZAAHI layer; when OFF, only public listings render
  // (PPV hidden by default). Founder spec 2026-05-31 v2 — see
  // buildZaahiFilter below for the direction logic. Persists via
  // localStorage "zaahi-vault-only-mode". Default OFF.
  //
  // Lazy-init from localStorage so state AND ref both start with the
  // user's last-session value before any useEffect runs. This is what
  // prevents the first-paint race that bit the v1 attempt
  // (commit 485711e, reverted 02e837f) — the ref needs to be correct
  // when loadZaahiPlots fires inside map.on("load"), which can happen
  // before a state-restoring useEffect.
  const [vaultOnlyMode, setVaultOnlyMode] = useState(loadVaultOnlyMode);

  // ── Archie map filters (Phase 2 archie client, 2026-05-30) ──
  // Refs (not state) so mapControls handlers can read/write them
  // without forcing a React render cycle on every tool invocation.
  // Filter state is composed with vaultOnlyMode in reapplyMapFilters
  // below; the same helper drives both the vault-only useEffect and
  // the Archie tool calls.
  const vaultOnlyModeRef = useRef(loadVaultOnlyMode());

  // Wave 2 (Filter Panel, 2026-06-02): filter state lives in
  // React.useState so the panel can render off it; refs are kept in
  // lockstep below so build*Filter() can read sync without going
  // through React render. Wave 1 archieLandUseRef / archieStatusRef
  // are replaced by the multi-valued + range refs below — the same
  // single source of truth for both Archie and the panel.
  const filterLandUseRef = useRef<string[]>([]);
  const filterUnifiedStatusRef = useRef<UnifiedStatus[]>([]);
  const filterAreaRangeRef = useRef<FilterState["areaRange"]>(null);
  const filterGfaRangeRef = useRef<FilterState["gfaRange"]>(null);
  const filterFarRangeRef = useRef<FilterState["farRange"]>(null);
  const filterPriceRangeRef = useRef<FilterState["priceRange"]>(null);
  const filterDistrictsRef = useRef<string[]>([]);

  const [filterState, setFilterState] = useState<FilterState>(EMPTY_FILTER_STATE);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  // Distinct ZAAHI listing districts — populated after /api/parcels/map
  // resolves inside loadZaahiPlots so the panel's District multi-select
  // has real options.
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  // Wave 2 follow-up (2026-06-02): the FilterPanel district autocomplete
  // wants a richer source pool than the 114 listing districts alone.
  // We lazy-fetch the DDA Communities KML + AD Communities GeoJSON the
  // first time the panel opens, then merge with the listings list. Both
  // /api/layers/* endpoints are public per CLAUDE.md, so plain fetch is
  // fine (no Bearer required). District filter STILL applies listings-
  // only — the divider in the panel keeps that explicit.
  const [availableCommunities, setAvailableCommunities] = useState<string[]>([]);
  // Live count of features visible inside the current viewport.
  // Computed via queryRenderedFeatures, debounced 500ms on moveend and
  // also after every filterState change. PMTiles count is "in viewport
  // only" because tile-level features have no global index — the panel
  // surfaces that honestly in its tooltip.
  const [visibleCount, setVisibleCount] = useState<{ listings: number; pmtiles: number } | undefined>(undefined);
  // Total ZAAHI listings loaded — drives the FilterPanel "Listings only · N"
  // header (was a hardcoded "114"; backlog #4 2026-06-16). Distinct from
  // visibleCount.listings (the filtered / in-view subset).
  const [totalListings, setTotalListings] = useState(0);
  const activeFilterCount = useMemo(
    () => countActiveFilters(filterState),
    [filterState],
  );
  useEffect(() => {
    vaultOnlyModeRef.current = vaultOnlyMode;
  }, [vaultOnlyMode]);

  // ── Wave 2 C3: live visible-feature counter (2026-06-02) ──
  // Only runs while the FilterPanel is open — otherwise we don't pay
  // the queryRenderedFeatures cost on every map move. PMTiles count
  // is viewport-bound (no global index); listings count is precise
  // since the 114 features are all loaded into the GeoJSON source.
  // Layer ID strings duplicated from the inner scope at L3499+; both
  // must stay in sync if those constants are ever renamed.
  useEffect(() => {
    if (!filterPanelOpen) return;
    const map = mapRef.current;
    if (!map) return;
    const ZAAHI_FILL = "zaahi-plots-fill";
    const PMTILES_FILLS = [
      "dda-land-tiles-fill",
      "ad-adm-tiles-fill",
      "ad-other-tiles-fill",
    ];
    let timer: number | null = null;
    function compute() {
      if (!map) return;
      try {
        const zaahiLayers = map.getLayer(ZAAHI_FILL) ? [ZAAHI_FILL] : [];
        const pmtilesLayers = PMTILES_FILLS.filter((id) => map.getLayer(id));
        const listingFeats = zaahiLayers.length
          ? map.queryRenderedFeatures({ layers: zaahiLayers })
          : [];
        const pmtilesFeats = pmtilesLayers.length
          ? map.queryRenderedFeatures({ layers: pmtilesLayers })
          : [];
        // De-dupe across tier-stacked PMTiles features (one plot
        // can have podium/body/crown tiers — count the plot once).
        const listingIds = new Set(listingFeats.map((f) => f.id));
        const pmtilesIds = new Set(
          pmtilesFeats.map((f) => String((f.properties as { plotNumber?: string })?.plotNumber ?? f.id)),
        );
        setVisibleCount({ listings: listingIds.size, pmtiles: pmtilesIds.size });
      } catch {
        // queryRenderedFeatures can throw mid-style-swap — silent recover.
      }
    }
    function debounced() {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(compute, 500);
    }
    map.on("moveend", debounced);
    // Initial measurement — wait a tick for the current filter to flush.
    timer = window.setTimeout(compute, 200);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      map.off("moveend", debounced);
    };
  }, [filterPanelOpen, filterState]);

  // ── Wave 2 follow-up: lazy district pool fetch (2026-06-02) ──
  // Runs only when the FilterPanel first opens. Result cached in
  // availableCommunities state so subsequent opens are instant.
  // Both /api/layers/communities and /api/layers/abu-dhabi-communities
  // are public (CLAUDE.md SECURITY RULES) — plain fetch.
  useEffect(() => {
    if (!filterPanelOpen) return;
    if (availableCommunities.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const [ddaRes, adRes] = await Promise.all([
          fetch("/api/layers/communities").then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch("/api/layers/abu-dhabi-communities").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (cancelled) return;
        const names = new Set<string>();
        // DDA Communities KML — parseCommunitiesKml exposes CNAME_E via
        // properties (KML parser uses lowercase OR uppercase depending
        // on attribute reading order; handle both defensively).
        const ddaFeats = (ddaRes as { features?: Array<{ properties?: Record<string, unknown> }> })?.features ?? [];
        for (const f of ddaFeats) {
          const p = f.properties ?? {};
          const raw = (p.CNAME_E ?? p.cname_e ?? "") as string;
          const n = String(raw).trim();
          if (n) names.add(n);
        }
        // AD Communities GeoJSON — COMMUNITYNAMEENG per
        // data/layers/abu-dhabi-communities.geojson schema.
        const adFeats = (adRes as { features?: Array<{ properties?: Record<string, unknown> }> })?.features ?? [];
        for (const f of adFeats) {
          const p = f.properties ?? {};
          const n = String(p.COMMUNITYNAMEENG ?? "").trim();
          if (n) names.add(n);
        }
        setAvailableCommunities(Array.from(names).sort());
      } catch {
        // Best-effort — leave the dropdown to the listings-only set if
        // both endpoints fail. Panel still works, just with fewer
        // suggestions.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterPanelOpen, availableCommunities.length]);

  // Merged district pool: 114 listing districts ∪ DDA communities (~224)
  // ∪ AD communities (~1.9K). Sorted alphabetically. The filter itself
  // still hits Parcel.district only (listings-only invariant).
  const mergedDistricts = useMemo(
    () =>
      Array.from(new Set([...availableDistricts, ...availableCommunities])).sort(),
    [availableDistricts, availableCommunities],
  );

  // ── Wave 2: filter state → refs sync (2026-06-02) ──
  // Mirror the canonical React state into the refs that build*Filter()
  // reads, then call reapplyMapFilters so all 12 layers update. When
  // any dimension is active and the user hasn't already enabled the
  // PMTiles overlays, auto-enable them so the filter is visible —
  // matches the Wave 1 behaviour for filter_by_land_use / by_status
  // but now applies regardless of entry point (panel or Archie).
  useEffect(() => {
    filterLandUseRef.current = filterState.landUse;
    filterUnifiedStatusRef.current = filterState.unifiedStatus;
    filterAreaRangeRef.current = filterState.areaRange;
    filterGfaRangeRef.current = filterState.gfaRange;
    filterFarRangeRef.current = filterState.farRange;
    filterPriceRangeRef.current = filterState.priceRange;
    filterDistrictsRef.current = filterState.districts;
    if (countActiveFilters(filterState) > 0) {
      setLayers((s) =>
        s.ddaLandPlots && s.adLandPlots
          ? s
          : { ...s, ddaLandPlots: true, adLandPlots: true },
      );
    }
    reapplyMapFilters();
    // reapplyMapFilters is a stable closure declared in the component
    // body; ESLint thinks it's a dependency but it's effectively a
    // ref-reader. Same exemption pattern as other map-side effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState]);

  // Auto-rotate camera — slow showcase rotation when the user is idle.
  // HYBRID first-visit default: ON for first-ever visit (no localStorage
  // key yet), respects saved choice on subsequent visits.
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(false);
  const [showAutoRotateHint, setShowAutoRotateHint] = useState(false);
  const autoRotateCtrlRef = useRef<AutoRotateController | null>(null);
  // Keyboard nav controller — always-on once installed in map-init.
  // Destroyed alongside the map. No external state needed.
  const kbdNavCtrlRef = useRef<KeyboardNavController | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  // Parcels portal — left rail list view of /api/parcels/map. Mutex
  // with the Layers panel because both anchor at left:60, top:64.
  const [portalOpen, setPortalOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  // MiniMap dock removed 2026-06-01 (founder spec) — `miniOpen`
  // state is gone. The Sun-time slider that used to live on the dock
  // now lives on the right rail (slot 6). All 7 layer toggles that
  // used to live on the dock top + left rails remain in the Layers
  // panel (LAYER_GROUPS).
  const legendRef = useRef<HTMLDivElement>(null);
  // Legend trigger lives on the right rail (slot 1). The
  // click-outside handler at L4182 skips clicks on this ref.
  const legendBtnRef = useRef<HTMLElement>(null);
  // Country-first hierarchy — one section per country, collapsible.
  // Phase 1: default Dubai expanded (where 114 ZAAHI listings live); on
  // first open of the layers panel we re-initialise from map center so
  // a user already panned to AD/Oman sees the right country expanded.
  const [countryOpen, setCountryOpen] = useState<Record<LayerCountry, boolean>>({
    dubai: true, abudhabi: false, otheruae: false, amenities: false,
  });
  // Per-category fold state — keys are `${country}:${category}`. Initial
  // default = DDA Layers (dda-admin) under Dubai open, every other
  // category closed (founder spec 2026-05-29).
  const [categoryOpen, setCategoryOpen] = useState<Record<string, boolean>>({
    "dubai:dda-admin": true,
  });
  const countryInitialisedRef = useRef(false);
  const [layerSearch, setLayerSearch] = useState("");
  // Phase 1 migration: Layers panel renders through <Panel> (polymorphic
  // element); HTMLElement is the conservative ref type — .contains() works
  // on any Element, and Panel's forwardRef is typed as React.Ref<HTMLElement>.
  const panelRef = useRef<HTMLElement>(null);
  const panelBtnRef = useRef<HTMLButtonElement>(null);
  // Layers state is lazy-init'd from localStorage so the user's previous
  // selection is restored when they come back to /parcels/map. Unknown
  // keys (layers added since their last visit) default to false via
  // loadSavedLayers merge. Save effect lives below.
  const [layers, setLayers] = useState<LayersState>(() => loadSavedLayers({
    // Founder spec 2026-04-15: all user-toggleable layers default OFF.
    // Only ZAAHI parcel polygons + ZAAHI Signature 3D buildings stay on
    // by default — those are the core listings (loaded unconditionally
    // via loadZaahiPlots, not gated by LayersState).
    communities: false,
    roads: false,
    metro: false,
    adMunicipalities: false,
    adDistricts: false,
    adCommunities: false,
    uaeDistricts: false,
    ddaProjects: false,
    ddaFreeZones: false,
    ddaLandPlots: false,
    adLandPlots: false,
    plotLabels: false,
    // District Names — default ON per founder spec 2026-05-24. Symbol
    // layer is gated by zoom ≥ 11 so it stays invisible at country
    // scale and only emerges at city scale.
    districtNames: true,
    // Amenities — data.dubai point overlays.
    evChargers: false,
    metroStations: false,
    tramStations: false,
    // Private Plot Vault — shared-with-me opt-in tab. Owner-side
    // entries render through the unified ZAAHI layers (Phase 3).
    vaultShared: false,
    marineStations: false,
    // Master plans default OFF — same lazy semantics as DDA. The user
    // clicks the checkbox (or the section checkbox) to load them.
    // No idle pre-fetch, no auto-load on map init.
    islands: false,
    meydan: false,
    alFurjan: false,
    intlCity23: false,
    residential12: false,
    d11: false,
    nadAlHammer: false,
    dubaiHills: false,
    damacHills2: false,
    damacLagoons: false,
    damacIslands: false,
    theValley: false,
    damacHills: false,
    mudon: false,
    jabelAliHills: false,
    arabianRanches1: false,
    nasGardens: false,
    dsp: false,
    businessBay: false,
    samaAlJadaf: false,
    arjan: false,
    dhcc2: false,
    barshaHeights: false,
    difcZabeel: false,
    jaddafWaterfront: false,
    dhcc1: false,
    difc: false,
    tilalAlGhaf: false,
    arabianRanches2: false,
    theVilla: false,
    arabianRanches3: false,
    dubaiSportsCity: false,
    villanova: false,
    theAcres: false,
    falconCity: false,
    alAryam: false,
    dubaiIndustrialCity: false,
    damacIslands2: false,
    wilds: false,
    townSquare: false,
    athlon: false,
    cherrywoods: false,
    portofino: false,
    haven: false,
    alBarari: false,
    jabalAliIndustrial: false,
    livingLegends: false,
    shorooq: false,
    cityOfArabia: false,
    serena: false,
    dubaiCreekHarbour: false,
    dubaiProductionCity: false,
    sobhaReserve: false,
    jumeirahGardenCity: false,
    sobhaElwood: false,
    dlrc: false,
    pearlJumeira: false,
    alKhawaneej: false,
    majan: false,
    laMer: false,
    dubaiLand: false,
    dubaiGolfCity: false,
    meraasUmmAlSheif: false,
    alMamzarFront: false,
    asmaran: false,
    jumeirahBay: false,
    reportageVillage: false,
    liwan: false,
    dubaiStudioCity: false,
    liwan2: false,
    naiaIsland: false,
    ardhCommunity: false,
    tijaraTown: false,
    warsanFirst: false,
    meraasMirdif: false,
    alHabtoorPolo: false,
    meraasUmmAmaraa: false,
    d3: false,
    alKhailGate: false,
    siteA: false,
    rukan: false,
    californiaResidence: false,
    meraasNaddAlHamar: false,
    palmarosa: false,
    diac: false,
    alWaha: false,
    dubaiHarbour: false,
    khawaneejLabour: false,
    warsanIndustrial: false,
    dubaiLifestyleCity: false,
    sufouhGardens: false,
    motorCity: false,
    taormina1: false,
    dubaiParks: false,
    cityWalk: false,
    arPolo: false,
    barshaThird: false,
    meraasBarsha2: false,
    dubaiOutsourceCity: false,
    burjKhalifa: false,
    ghafWoods: false,
    taormina2: false,
    bianca: false,
    mjl: false,
    dhKhawaneej1: false,
    remraam: false,
    echoPlex: false,
    sustainableCity: false,
    jbr: false,
    ghoroob: false,
    dpBarshaSouth3: false,
    marsaAlArab: false,
    bluewaters: false,
    siteD: false,
    khailHeights: false,
    meraasUmmAlDaman: false,
    dubaiLand673: false,
    shamalYalayis1: false,
    tecomQouz2: false,
    globalVillage: false,
    layan: false,
    dpgMbr: false,
    dwc: false,
    labourQuoz: false,
    schoolsFz: false,
    dwcNfz: false,
    shamalJai1: false,
    jaiStaff: false,
    shamalTc2: false,
    nuzul: false,
    koa: false,
    sobhaSanctuary: false,
    boxpark: false,
    shamalNas1: false,
    lastExit: false,
    scaramanga: false,
    meraasWarqa3: false,
    jumeirahCentral: false,
    oasisVillage: false,
    emiratesTowers: false,
    meraasQuoz3: false,
    marsaAlseef: false,
    meraasWadiAlshabak: false,
    shamalBarsha2: false,
    shamalNahda2: false,
    meraasSaih1: false,
    dubaiPoliceUad: false,
    meraasRakhor3: false,
    meraasMarsaDubai: false,
    shamalHadaeq: false,
    jbh: false,
    madinatJumeirah: false,
    tecomSaih: false,
    cultureVillage2: false,
    meraasBs2: false,
    shamalMuh2: false,
    shamalQuoz2: false,
    cultureVillage3: false,
    meraasSatwa: false,
    shamalMamzar: false,
    shamalRaffa: false,
    meraasMamzar: false,
    dhSafouh1: false,
    dubaiLandB104: false,
    dhamRowaiyah1: false,
    dubaiLandB208: false,
    theBeach: false,
    shamalUs3: false,
    meraasHemaira: false,
    dpQuoz2: false,
    dubaiLandB103: false,
    jgJumeira2: false,
    dubaiLandT15: false,
    shamalWasl: false,
    dubaiLandA304: false,
    eahm: false,
    meraasZabeel2: false,
    meraasJafiliya: false,
    kiteBeach: false,
    meraasAlamardi: false,
    meraasPortSaeed: false,
    dl6461281: false,
    shamalOudMetha: false,
    shamalQuoz3: false,
    dubaiLandA307: false,
    was36456408: false,
    shamalQuoz1: false,
    meraasNas4: false,
    shamalMuhaisnah1: false,
    shamalJumeira1: false,
    meraasQusais2: false,
    shamalMaha: false,
    lunaya: false,
    meraasUs1: false,
    shamalNahda1: false,
    shamalSafouh1: false,
    shamalMargham: false,
    wildWadi: false,
    meraasBs1: false,
    dubaiLandA409: false,
    zabeelFirst: false,
    was36454931: false,
    meraas3460266: false,
    museumFuture: false,
    alJalila: false,
    dubaiLandA102: false,
    meraasWarqa2: false,
    meraasJumeira1: false,
    dpJafiliya: false,
    burjAlArab: false,
    shamalBs1: false,
    dubaiPoliceAcademy: false,
    shamalMankhool: false,
  }) as LayersState);
  const layersRef = useRef(layers);
  layersRef.current = layers;
  // Persist any layer toggle change. Debounced by React's batched state
  // updates; localStorage write is cheap. Pair with loadSavedLayers above.
  useEffect(() => {
    saveLayers(layers as unknown as Record<string, boolean>);
  }, [layers]);
  const themeRef = useRef<Theme>("light");
  themeRef.current = theme;

  // ─────────────────────────────────────────────────────────────────────
  //  LAYER REGISTRY + LAZY LOADER
  //
  //  One source of truth for every overlay (Communities, Roads, the 6
  //  master plans, all 206 DDA districts). Replaces ~6,000 lines of
  //  inlined per-layer fetch / addSource / addLayer / mouse-event code.
  //
  //  Lifecycle:
  //    - kind === "base"       → eager-load on map init
  //    - kind === "masterplan" → idle-load 2 seconds after map init
  //    - kind === "dda"        → lazy-load on first toggle ON
  //
  //  loadedLayersRef tracks which layers have been fetched + added to
  //  the map already, so we never re-fetch on re-toggle. After a basemap
  //  swap (theme change) the source registry is wiped by maplibre, so
  //  attachOverlays clears the loaded set and re-loads everything that
  //  was previously on.
  // ─────────────────────────────────────────────────────────────────────
  type LayerKind = "base" | "masterplan" | "dda" | "point";
  // Point overlays (kind === "point") render as MapLibre `symbol` layers
  // backed by SDF icons (see loadAmenityIcons + public/icons/amenities/).
  // The icon image is tinted via paint.icon-color so a single SVG can
  // serve multiple per-feature colours (e.g. Metro per-line).
  type LayerDef = {
    key: keyof LayersState;
    kind: LayerKind;
    label: string;
    url: string;
    srcId: string;
    fillId?: string;
    lineId?: string;
    symbolId?: string;
    fillPaint?: maplibregl.FillLayerSpecification["paint"];
    linePaint?: maplibregl.LineLayerSpecification["paint"];
    symbolLayout?: maplibregl.SymbolLayerSpecification["layout"];
    symbolPaint?: maplibregl.SymbolLayerSpecification["paint"];
    promoteId?: string;
    hoverLabel?: string; // for master plan name popup
    pointPopupFields?: string[]; // for point hover/click popups
  };

  const masterPlanPaint: maplibregl.LineLayerSpecification["paint"] = {
    "line-color": "#C8A96E",
    "line-width": 1.5,
    "line-opacity": 0.85,
    "line-dasharray": [3, 2],
  };
  const ddaFillPaint: maplibregl.FillLayerSpecification["paint"] = {
    "fill-color": "#C8A96E",
    "fill-opacity": 0.05,
  };

  const LAYER_REGISTRY = useMemo<LayerDef[]>(() => {
    const isDark = themeRef.current === "dark";
    const out: LayerDef[] = [
      // ── Base layers (eager) ──
      {
        key: "communities",
        kind: "base",
        label: "Communities",
        url: "/api/layers/communities",
        srcId: COMMUNITIES_SRC,
        fillId: COMMUNITIES_FILL,
        lineId: COMMUNITIES_LINE,
        promoteId: "COMM_NUM",
        fillPaint: {
          "fill-color": GOLD,
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false], 0.12,
            0,
          ],
        },
        linePaint: {
          "line-color": GOLD,
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false], 2,
            1,
          ],
          "line-opacity": 0.85,
        },
      },
      {
        key: "roads",
        kind: "base",
        label: "Major Roads",
        url: "/api/layers/roads",
        srcId: ROADS_SRC,
        lineId: ROADS_LINE,
        linePaint: {
          "line-color": isDark ? "#888888" : "#666666",
          "line-width": 2,
          "line-opacity": 0.7,
        },
      },
      {
        key: "metro",
        kind: "base",
        label: "Metro Lines",
        url: "/api/layers/metro",
        srcId: METRO_SRC,
        lineId: METRO_LINE,
        linePaint: {
          "line-color": [
            "match", ["get", "RAIL_ROUTE_ID"],
            "2029508", "#E74C3C",  // Red Line
            "2029509", "#27AE60",  // Green Line
            "#9B59B6",             // Route 2020 / other
          ],
          "line-width": 3,
          "line-opacity": 0.85,
        },
      },
      // saudiGovernorates + riyadhZones LayerDef entries removed
      // 2026-05-24 along with the rest of the Saudi coverage.
      // ── Abu Dhabi boundaries ──
      {
        key: "adMunicipalities",
        kind: "base",
        label: "AD Municipalities",
        url: "/api/layers/abu-dhabi-municipalities",
        srcId: AD_MUN_SRC,
        fillId: AD_MUN_FILL,
        lineId: AD_MUN_LINE,
        fillPaint: {
          "fill-color": "#C8A96E",
          "fill-opacity": 0.04,
        },
        linePaint: {
          "line-color": "#B8975E",
          "line-width": 3,
          "line-opacity": 0.8,
        },
      },
      {
        key: "adDistricts",
        kind: "base",
        label: "AD Districts",
        url: "/api/layers/abu-dhabi-districts",
        srcId: AD_DIST_SRC,
        fillId: AD_DIST_FILL,
        lineId: AD_DIST_LINE,
        fillPaint: {
          "fill-color": "#C8A96E",
          "fill-opacity": 0.06,
        },
        linePaint: {
          "line-color": "#C8A96E",
          "line-width": 2,
          "line-opacity": 0.75,
        },
      },
      {
        key: "adCommunities",
        kind: "base",
        label: "AD Communities",
        url: "/api/layers/abu-dhabi-communities",
        srcId: AD_COMM_SRC,
        fillId: AD_COMM_FILL,
        lineId: AD_COMM_LINE,
        fillPaint: {
          "fill-color": "#C8A96E",
          "fill-opacity": 0.04,
        },
        linePaint: {
          "line-color": "#C8A96E",
          "line-width": 1,
          "line-opacity": 0.6,
        },
      },
      {
        key: "uaeDistricts",
        kind: "base",
        label: "UAE Districts",
        url: "/api/layers/uae-districts",
        srcId: UAE_DIST_SRC,
        fillId: UAE_DIST_FILL,
        lineId: UAE_DIST_LINE,
        fillPaint: {
          "fill-color": "#E63946",
          "fill-opacity": 0.05,
        },
        linePaint: {
          "line-color": "#E63946",
          "line-width": 1.5,
          "line-opacity": 0.8,
        },
      },
      // ── DDA Project Boundaries & Free Zones ──
      {
        key: "ddaProjects",
        kind: "base",
        label: "DDA Project Boundaries",
        url: "/api/layers/dda-projects",
        srcId: DDA_PROJ_SRC,
        fillId: DDA_PROJ_FILL,
        lineId: DDA_PROJ_LINE,
        fillPaint: {
          "fill-color": "#C8A96E",
          "fill-opacity": 0.04,
        },
        linePaint: {
          "line-color": "#C8A96E",
          "line-width": 2,
          "line-opacity": 0.75,
        },
      },
      {
        key: "ddaFreeZones",
        kind: "base",
        label: "DDA Free Zones",
        url: "/api/layers/dda-freezones",
        srcId: DDA_FZ_SRC,
        fillId: DDA_FZ_FILL,
        lineId: DDA_FZ_LINE,
        fillPaint: {
          "fill-color": "#C8A96E",
          "fill-opacity": 0.04,
        },
        linePaint: {
          "line-color": "#B8975E",
          "line-width": 2,
          "line-opacity": 0.7,
        },
      },
      // ── Master plans (idle-load) ──
      { key: "islands",      kind: "masterplan", label: "Dubai Islands",            url: "/api/layers/dubai-islands",              srcId: ISLANDS_SRC, lineId: ISLANDS_LINE, linePaint: masterPlanPaint, hoverLabel: "Dubai Islands master plan" },
      { key: "meydan",       kind: "masterplan", label: "Meydan Horizon",           url: "/api/layers/masterplans/meydan-horizon", srcId: MEYDAN_SRC,  lineId: MEYDAN_LINE,  linePaint: masterPlanPaint, hoverLabel: "Meydan Horizon master plan" },
      { key: "alFurjan",     kind: "masterplan", label: "Al Furjan",                url: "/api/layers/masterplans/al-furjan",      srcId: FURJAN_SRC,  lineId: FURJAN_LINE,  linePaint: masterPlanPaint, hoverLabel: "Al Furjan master plan" },
      { key: "intlCity23",   kind: "masterplan", label: "Intl City 2 & 3",          url: "/api/layers/masterplans/intl-city-23",   srcId: IC23_SRC,    lineId: IC23_LINE,    linePaint: masterPlanPaint, hoverLabel: "International City Phase 2 & 3" },
      { key: "residential12", kind: "masterplan", label: "Residential District",    url: "/api/layers/masterplans/residential-12", srcId: RES12_SRC,   lineId: RES12_LINE,   linePaint: masterPlanPaint, hoverLabel: "Residential District Phase I & II" },
      { key: "d11",          kind: "masterplan", label: "D11 — Parcel L/D",         url: "/api/layers/masterplans/d11-parcel-ld",  srcId: D11_SRC,     lineId: D11_LINE,     linePaint: masterPlanPaint, hoverLabel: "D11 — Parcel L/D master plan" },
      { key: "nadAlHammer",  kind: "masterplan", label: "Nad Al Hammer",            url: "/api/layers/masterplans/nad-al-hammer",  srcId: NAD_AL_HAMMER_SRC, lineId: NAD_AL_HAMMER_LINE, linePaint: masterPlanPaint, hoverLabel: "Nad Al Hammer master plan" },
      // ── Amenities (data.dubai point overlays — kind: "point") ──
      // EV Chargers (DEWA): teal palette colour, lightning bolt glyph.
      {
        key: "evChargers",
        kind: "point",
        label: "EV Chargers",
        url: "/api/layers/amenities/ev-chargers",
        srcId: EV_CHARGERS_SRC,
        symbolId: EV_CHARGERS_SYMBOL,
        symbolLayout: {
          "icon-image": "amenity-ev-charger",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.35, 14, 0.55, 18, 0.9],
          "icon-allow-overlap": ["step", ["zoom"], false, 12, true],
          "icon-anchor": "center",
          // 2026-05-24 follow-up to ddee824: MapLibre pre-initialises a
          // default `text-font` (["Open Sans Regular","Arial Unicode MS
          // Regular"]) for every symbol layer it ingests at style-load,
          // even icon-only layers without `text-field`. The Arial
          // Unicode MS fontstack 404s as HTML on openmaptiles → "Unimplemented
          // type: 4". Pin the fontstack to a known-good one to block
          // the broken fallback chain at style-load time.
          "text-font": ["Open Sans Regular"],
        },
        symbolPaint: {
          "icon-color": "#1B4965",           // palette TEAL (unchanged)
          "icon-opacity": 0.95,
          "icon-halo-color": "#FFFFFF",
          "icon-halo-width": 1.2,
        },
        pointPopupFields: [
          "location_name", "location_address",
          "totalnbofconnectors", "connectortype",
        ],
      },
      // Metro Stations: colour driven by line_name (matches existing
      // Metro Lines layer painting at /api/layers/metro).
      {
        key: "metroStations",
        kind: "point",
        label: "Metro Stations",
        url: "/api/layers/amenities/metro-stations",
        srcId: METRO_STATIONS_SRC,
        symbolId: METRO_STATIONS_SYMBOL,
        symbolLayout: {
          "icon-image": "amenity-metro-station",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.4, 14, 0.6, 18, 0.95],
          "icon-allow-overlap": ["step", ["zoom"], false, 11, true],
          "icon-anchor": "center",
          // See EV-charger comment above — same MapLibre default-fontstack
          // pre-fetch behaviour, same broken Arial Unicode MS endpoint.
          "text-font": ["Open Sans Regular"],
        },
        symbolPaint: {
          "icon-color": [
            "match", ["get", "line_name"],
            "Red Metro line",   "#E74C3C",
            "Green Metro line", "#27AE60",
            /* default — Route 2020 + future expansions */ "#9B59B6",
          ],
          "icon-opacity": 0.95,
          "icon-halo-color": "#FFFFFF",
          "icon-halo-width": 1.5,
        },
        pointPopupFields: [
          "location_name_english", "line_name",
          "station_opening_date", "zone_id",
        ],
      },
      // Tram Stations: amber palette colour (closest to Dubai Tram livery).
      {
        key: "tramStations",
        kind: "point",
        label: "Tram Stations",
        url: "/api/layers/amenities/tram-stations",
        srcId: TRAM_STATIONS_SRC,
        symbolId: TRAM_STATIONS_SYMBOL,
        symbolLayout: {
          "icon-image": "amenity-tram-station",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.4, 14, 0.6, 18, 0.95],
          "icon-allow-overlap": ["step", ["zoom"], false, 11, true],
          "icon-anchor": "center",
          // See EV-charger comment above.
          "text-font": ["Open Sans Regular"],
        },
        symbolPaint: {
          "icon-color": "#E67E22",           // palette AMBER (unchanged)
          "icon-opacity": 0.95,
          "icon-halo-color": "#FFFFFF",
          "icon-halo-width": 1.2,
        },
        pointPopupFields: [
          "location_name_english", "line_name",
          "station_opening_date", "zone_id",
        ],
      },
      // Marine Stations: deeper teal-navy, visually distinct from EV.
      {
        key: "marineStations",
        kind: "point",
        label: "Marine Stations",
        url: "/api/layers/amenities/marine-stations",
        srcId: MARINE_STATIONS_SRC,
        symbolId: MARINE_STATIONS_SYMBOL,
        symbolLayout: {
          "icon-image": "amenity-marine-station",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.35, 14, 0.55, 18, 0.9],
          "icon-allow-overlap": ["step", ["zoom"], false, 12, true],
          "icon-anchor": "center",
          // See EV-charger comment above.
          "text-font": ["Open Sans Regular"],
        },
        symbolPaint: {
          "icon-color": "#1A4D7A",           // deep navy-teal (unchanged)
          "icon-opacity": 0.95,
          "icon-halo-color": "#FFFFFF",
          "icon-halo-width": 1.2,
        },
        pointPopupFields: [
          "station_name", "route_name",
          "valid_from", "valid_until",
        ],
      },
    ];
    // ── DDA districts (lazy) ──
    for (const d of DDA_LAYERS) {
      const slug = d.srcId.replace(/^dda-/, "");
      out.push({
        key: d.key,
        kind: "dda",
        label: d.label,
        url: `/api/layers/dda/${slug}`,
        srcId: d.srcId,
        fillId: `${d.srcId}-fill`,
        lineId: d.lineId,
        fillPaint: ddaFillPaint,
        linePaint: masterPlanPaint,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loaded / loading sets — refs because we don't want to re-render on
  // every layer fetch.
  const loadedLayersRef = useRef<Set<string>>(new Set());
  const loadingLayersRef = useRef<Set<string>>(new Set());
  // District-name centroid features cached across basemap swaps —
  // computed once from /api/layers/communities (see
  // ensureDistrictNamesLayer below) and reused on every setStyle.
  const districtNameFeaturesRef = useRef<GeoJSON.Feature<GeoJSON.Point>[] | null>(null);

  // Per-load hover registration. The handlers themselves are defined
  // inside map.on("load") because they close over the popup; we stash
  // them on a ref so loadLayer can attach them to freshly-added layers.
  const hoverHandlersRef = useRef<{
    ddaPlotHover: (() => void) | null;
    masterPlanLeave: (() => void) | null;
    masterPlanHover: ((label: string) => (e: maplibregl.MapMouseEvent) => void) | null;
    // Amenity-point hover/click factory: builds a mousemove handler
    // bound to a layer's label + popup field list.
    pointHover: (
      (label: string, fields: string[]) => (e: maplibregl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => void
    ) | null;
    pointLeave: (() => void) | null;
    pointClick: (
      (label: string, fields: string[]) => (e: maplibregl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => void
    ) | null;
  }>({
    ddaPlotHover: null, masterPlanLeave: null, masterPlanHover: null,
    pointHover: null, pointLeave: null, pointClick: null,
  });

  async function loadLayer(map: MLMap, def: LayerDef): Promise<boolean> {
    if (loadedLayersRef.current.has(def.key)) return true;
    if (loadingLayersRef.current.has(def.key)) return false;
    loadingLayersRef.current.add(def.key);
    try {
      const r = await fetch(def.url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: GeoJSON.FeatureCollection = await r.json();
      // Style can be torn down during the await (basemap swap, unmount,
      // React strict-mode remount). Bail before touching the style.
      if (!map.getStyle()) return false;
      if (!map.getSource(def.srcId)) {
        map.addSource(def.srcId, {
          type: "geojson",
          data,
          ...(def.promoteId ? { promoteId: def.promoteId } : {}),
        });
      }
      if (def.fillPaint && def.fillId && !map.getLayer(def.fillId)) {
        map.addLayer({ id: def.fillId, type: "fill", source: def.srcId, paint: def.fillPaint });
      }
      if (def.lineId && def.linePaint && !map.getLayer(def.lineId)) {
        map.addLayer({
          id: def.lineId,
          type: "line",
          source: def.srcId,
          paint: def.linePaint,
          ...(def.key === "roads"
            ? { layout: { "line-cap": "round" as const, "line-join": "round" as const } }
            : {}),
        });
      }
      if (def.kind === "point" && def.symbolId && def.symbolLayout && !map.getLayer(def.symbolId)) {
        map.addLayer({
          id: def.symbolId,
          type: "symbol",
          source: def.srcId,
          layout: { ...def.symbolLayout, visibility: "none" }, // toggled on by setLayerVisibility
          paint: def.symbolPaint,
        });
        const h = hoverHandlersRef.current;
        const fields = def.pointPopupFields ?? [];
        if (h.pointHover && h.pointLeave && h.pointClick) {
          bindLayerEvent(map, "mousemove", def.symbolId, h.pointHover(def.label, fields) as (e: unknown) => void);
          bindLayerEvent(map, "mouseleave", def.symbolId, h.pointLeave as (e: unknown) => void);
          bindLayerEvent(map, "click", def.symbolId, h.pointClick(def.label, fields) as (e: unknown) => void);
        }
      }
      if (def.kind === "dda" && def.lineId) {
        const labelId = ddaLabelId(def.srcId);
        if (!map.getLayer(labelId)) {
          const isDark = themeRef.current === "dark";
          map.addLayer({
            id: labelId,
            type: "symbol",
            source: def.srcId,
            minzoom: 15,
            layout: {
              "text-field": ["coalesce", ["get", "PLOT_NUMBER"], ""],
              "text-size": 10,
              // 2026-05-24 fix: openmaptiles glyph CDN returns
              // text/html (not protobuf) for the "Noto Sans Regular"
              // fontstack, breaking the layer with "Unimplemented
              // type: 4". The Open Sans Regular endpoint returns
              // valid PBF, so use that instead. Pair-fix for the
              // DISTRICT_NAMES_LAYER text-font below.
              "text-font": ["Open Sans Regular"],
              "text-allow-overlap": false,
              "symbol-placement": "point",
              visibility: "none",
            },
            paint: {
              // Warm off-white on a soft-blurred navy halo for a
              // "frosted glass" feel without full CSS backdrop-filter
              // (WebGL text can't have real CSS blur — text-halo-blur
              // is the closest approximation we have).
              "text-color": isDark ? "#f5f1e8" : "#1A1A2E",
              "text-halo-color": isDark ? "rgba(10, 22, 40, 0.75)" : "rgba(255, 255, 255, 0.85)",
              "text-halo-width": 1.8,
              "text-halo-blur": 0.5,
            },
          });
        }
        const h = hoverHandlersRef.current;
        if (h.ddaPlotHover && h.masterPlanLeave) {
          bindLayerEvent(map, "mousemove", def.lineId, h.ddaPlotHover as (e: unknown) => void);
          bindLayerEvent(map, "mouseleave", def.lineId, h.masterPlanLeave as (e: unknown) => void);
        }
      }
      if (def.kind === "masterplan" && def.hoverLabel && def.lineId) {
        const h = hoverHandlersRef.current;
        if (h.masterPlanHover && h.masterPlanLeave) {
          bindLayerEvent(map, "mousemove", def.lineId, h.masterPlanHover(def.hoverLabel) as (e: unknown) => void);
          bindLayerEvent(map, "mouseleave", def.lineId, h.masterPlanLeave as (e: unknown) => void);
        }
      }
      loadedLayersRef.current.add(def.key);
      return true;
    } catch (e) {
      console.error(`[layer ${def.key}] load failed`, e);
      return false;
    } finally {
      loadingLayersRef.current.delete(def.key);
    }
  }

  async function setLayerVisibility(map: MLMap, def: LayerDef, on: boolean, plotLabelsOn?: boolean) {
    if (on && !loadedLayersRef.current.has(def.key)) {
      const ok = await loadLayer(map, def);
      if (!ok) return;
    }
    const v = on ? "visible" : "none";
    if (def.fillId && map.getLayer(def.fillId)) {
      map.setLayoutProperty(def.fillId, "visibility", v);
    }
    if (def.lineId && map.getLayer(def.lineId)) {
      map.setLayoutProperty(def.lineId, "visibility", v);
    }
    if (def.symbolId && map.getLayer(def.symbolId)) {
      map.setLayoutProperty(def.symbolId, "visibility", v);
    }
    if (def.kind === "dda") {
      const labelId = ddaLabelId(def.srcId);
      if (map.getLayer(labelId)) {
        const labelsOn = plotLabelsOn ?? layersRef.current.plotLabels;
        map.setLayoutProperty(labelId, "visibility", on && labelsOn ? "visible" : "none");
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  //  ZAAHI Plots — the real listings layer.
  //
  //  Always loads at map start. Reads /api/parcels/map (auth-required —
  //  served only to approved users via apiFetch). For each parcel:
  //   - the polygon goes into ZAAHI_PLOTS_SRC and feeds 4 layers
  //     (fill / line / glow halo / crisp pulsing outline)
  //   - one or more 3D extrusion polygons (podium / body / crown) go
  //     into ZAAHI_BUILDINGS_SRC and feed 4 fill-extrusion layers
  //
  //  Building footprint generation:
  //   - if the affection plan has buildingLimitGeometry → use it
  //   - otherwise inset the plot polygon by the average DDA setback
  //   - for MIXED_USE: stepped tower with 3 visible tiers
  //   - for FUTURE_DEVELOPMENT: polygon only, no extrusion
  //
  //  All 3D heights come from maxHeightMeters in the affection plan,
  //  with a fallback derived from GFA / plot area / coverage when DDA
  //  doesn't have it. Idempotent on map.getSource — safe to call after
  //  a basemap swap.
  // ─────────────────────────────────────────────────────────────────────
  // ── ZAAHI Signature 3D — setback helpers ───────────────────────────
  // Spec lives in CLAUDE.md "Правила 3D моделей (ZAAHI Signature)".
  // The DB still stores the raw DDA setbacks per plan; these helpers
  // pick a single representative metres-value to inset the polygon by.

  /** Land-use defaults when DDA has no per-plot setback data. */
  function defaultSetbackM(landUse: string | null, sub: string | null): number {
    if (!landUse) return 5;
    switch (landUse) {
      case "RESIDENTIAL":
        // Villas / townhouses: 3m all around. Apartments: 5m road
        // + 3m sides → ~4m representative for a uniform inset.
        if (sub && /villa|townhouse|town\s*house/i.test(sub)) return 3;
        return 4;
      case "COMMERCIAL":
      case "OFFICE":
      case "RETAIL":
        return 0; // commercial fills the plot edge to edge
      case "HOTEL":
      case "HOSPITALITY":
        return 3;
      case "INDUSTRIAL":
      case "WAREHOUSE":
        return 4;
      case "FUTURE_DEVELOPMENT":
      case "FUTURE DEVELOPMENT":
        // Follow the INDUSTRIAL pattern: 4 m inset. Visually produces
        // one near-plot-sized block, same treatment founder ratified
        // 2026-04-23 for FUTURE_DEVELOPMENT plots.
        return 4;
      case "EDUCATIONAL":
      case "EDUCATION":
      case "HEALTHCARE":
        return 5;
      case "AGRICULTURAL":
      case "AGRICULTURE":
        return 10;
      case "MIXED_USE":
        return 4;
      default:
        return 5;
    }
  }

  /**
   * Pick the metres value to use for inset. Prefer DDA's affection-plan
   * setbacks (most specific), fall back to land-use defaults, and bypass
   * inset entirely for very small plots.
   */
  function computeSetbackM(
    plotSqft: number,
    landUse: string | null,
    setbacks: Array<{ side: number; building: number | null; podium: number | null }> | null,
    sub: string | null,
  ): number {
    // Tiny plots — building fills the boundary, no setback.
    if (plotSqft > 0 && plotSqft < 5000) return 0;

    if (setbacks && setbacks.length > 0) {
      const vals = setbacks
        .map((s) => s.building ?? s.podium ?? 0)
        .filter((v) => v > 0);
      if (vals.length > 0) {
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      }
    }
    return defaultSetbackM(landUse, sub);
  }

  /**
   * Inset a polygon ring uniformly toward its centroid by `setbackM`
   * metres. Caps the resulting scale at 0.5 so very deep setbacks on
   * small plots still produce a visible building. setbackM <= 0 returns
   * the ring unchanged (used for the small-plot bypass + commercial).
   */
  function insetRingByMeters(ring: number[][], setbackM: number): number[][] {
    if (setbackM <= 0) return ring;
    const lngs = ring.map((p) => p[0]);
    const lats = ring.map((p) => p[1]);
    const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
    const dLng =
      (Math.max(...lngs) - Math.min(...lngs)) *
      111000 *
      Math.cos((midLat * Math.PI) / 180);
    const dLat = (Math.max(...lats) - Math.min(...lats)) * 111000;
    const halfWidth = Math.min(dLng, dLat) / 2;
    if (halfWidth <= 0) return ring;
    const scale = Math.max(0.5, 1 - setbackM / halfWidth);
    const cLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return ring.map(([lng, lat]) => [
      cLng + (lng - cLng) * scale,
      cLat + (lat - cLat) * scale,
    ]);
  }

  // Phase 3 vault unification (2026-05-30): function is now idempotent —
  // safe to call after a vault add to refresh the source. On first call
  // it creates sources + layers; on subsequent calls it calls setData
  // on the existing geojson sources.
  async function loadZaahiPlots(map: MLMap) {
    if (!map.getStyle()) return;
    try {
      const r = await apiFetch("/api/parcels/map");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const payload = (await r.json()) as {
        items: Array<{
          id: string;
          plotNumber: string;
          district: string;
          emirate: string;
          status: string;
          area: number;
          geometry: GeoJSON.Polygon | null;
          currentValuation: string | null;
          // Phase 3 vault unification (2026-05-30): caller's own
          // VAULT_PRIVATE parcels arrive in the same payload tagged
          // with isVault + vaultEntryId so the click handler can route
          // to VaultSidePanelAdapter. conflictsWithOthers drives the
          // shared conflict-marker layer.
          isVault: boolean;
          vaultEntryId: string | null;
          conflictsWithOthers: boolean;
          plan: {
            projectName?: string | null;
            community?: string | null;
            maxFloors?: number | null;
            maxHeightMeters?: number | null;
            maxHeightCode?: string | null;
            plotAreaSqm?: number | null;
            plotAreaSqft?: number | null;
            maxGfaSqm?: number | null;
            maxGfaSqft?: number | null;
            sitePlanIssue?: string | null;
            fetchedAt?: string | null;
            far?: number | null;
            buildingLimitGeometry?: GeoJSON.Polygon | null;
            setbacks?: Array<{ side: number; building: number | null; podium: number | null }> | null;
            landUseMix?: Array<{ category: string; sub?: string | null }> | null;
            buildingStyle?: string | null;
          } | null;
        }>;
      };

      // Style may have been torn down during the fetch (basemap swap,
      // unmount). Bail before touching map.addSource / map.addLayer.
      if (!map.getStyle()) return;

      // Split plot numbers by isVault so PMTiles exclusion can switch
      // direction with vault-only mode (founder spec 2026-05-31, symmetric
      // revision). Each side is excluded from PMTiles only while ZAAHI is
      // currently rendering it — the other side falls through as PMTiles
      // background, filling the gap left by the direction-hidden ZAAHI
      // feature. See applyZaahiExclusionToTileLayers below.
      const listingsPnSet = new Set<string>();
      const vaultPnSet = new Set<string>();
      for (const it of payload.items) {
        (it.isVault ? vaultPnSet : listingsPnSet).add(it.plotNumber);
      }
      zaahiListingPnRef.current = listingsPnSet;
      zaahiVaultPnRef.current = vaultPnSet;

      // Hide PMTiles features that would visually collide with whichever
      // ZAAHI side is currently rendering (no double-stacking of curated
      // SIGNATURE building over the PMTiles background building). The
      // exclude set depends on vault-only direction — see
      // applyZaahiExclusionToTileLayers for the full rules and the
      // privacy rationale. 12 setFilter calls (4 sources × 3 layers each).
      applyZaahiExclusionToTileLayers(map);

      const plotFeatures: GeoJSON.Feature[] = [];
      // One Point per conflicting vault plot, at the plot's centroid.
      // Fills VAULT_CONFLICT_MARKERS_SRC — see the constant for why the
      // markers cannot ride the polygon source.
      const conflictMarkerFeatures: GeoJSON.Feature[] = [];
      const buildingFeatures: GeoJSON.Feature[] = [];
      // ?archetypes=1 — per-land-use morphology massing fed to the Three.js
      // CustomLayer at the end of this function. Accumulated alongside the
      // fill-extrusion features; empty + ignored when the flag is off.
      const archetypeInputs: ArchetypeBuildingInput[] = [];
      for (const it of payload.items) {
        if (!it.geometry || it.geometry.type !== "Polygon") continue;
        const aed = it.currentValuation ? Math.floor(Number(it.currentValuation) / 100) : null;
        // landUse is null when DDA has no land-use info — those parcels
        // render as outline-only (no fill, no 3D extrusion).
        const landUse = deriveLandUse(it.plan?.landUseMix);
        const hasLandUse = landUse != null;
        plotFeatures.push({
          type: "Feature",
          id: it.id,
          geometry: it.geometry,
          properties: {
            id: it.id,
            plotNumber: it.plotNumber,
            district: it.district,
            emirate: it.emirate,
            area: it.area,
            priceAed: aed,
            landUse: landUse ?? "",
            hasLandUse,
            color: hasLandUse
              ? (ZAAHI_LANDUSE_COLOR[landUse] ?? ZAAHI_DEFAULT_COLOR)
              : ZAAHI_DEFAULT_COLOR,
            // Hover-card fields (flattened from latest affection plan).
            projectName: it.plan?.projectName ?? "",
            plotAreaSqm: it.plan?.plotAreaSqm ?? 0,
            plotAreaSqft: it.plan?.plotAreaSqft ?? 0,
            maxGfaSqm: it.plan?.maxGfaSqm ?? 0,
            maxGfaSqft: it.plan?.maxGfaSqft ?? 0,
            maxFloors: it.plan?.maxFloors ?? 0,
            maxHeightMeters: it.plan?.maxHeightMeters ?? 0,
            maxHeightCode: it.plan?.maxHeightCode ?? "",
            far: it.plan?.far ?? 0,
            planDateIso: it.plan?.sitePlanIssue ?? it.plan?.fetchedAt ?? "",
            // Vault branch (Phase 3) — drives click routing + vault-only
            // mode filter. The conflict marker no longer reads these off
            // this source; it gets its own Point feature below.
            isVault: it.isVault,
            vaultEntryId: it.vaultEntryId,
            conflictsWithOthers: it.conflictsWithOthers,
            // Archie filter_by_status tool (Phase 2 archie client)
            // reads this. ParcelStatus enum from /api/parcels/map.
            status: it.status,
          },
        });
        // Conflict marker — one centroid Point per conflicting vault plot.
        // Sits above the `hasLandUse` early-return below on purpose: a vault
        // entry can conflict while DDA has not classified the plot yet, and
        // that entry still needs its dot.
        if (it.isVault && it.conflictsWithOthers) {
          const centroid = ringCentroid(it.geometry.coordinates[0]);
          if (centroid) {
            conflictMarkerFeatures.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: centroid },
              properties: {
                id: it.id,
                plotNumber: it.plotNumber,
                vaultEntryId: it.vaultEntryId,
              },
            });
          }
        }
        // Skip 3D building generation for parcels without a land use —
        // founder spec: outline only when land use is missing.
        if (!hasLandUse) continue;
        // NB: FUTURE_DEVELOPMENT plots flow through the standard ZAAHI
        // 3D path below — they are NOT short-circuited. The path's
        // `defaultSetbackM` / height-fallback / FLAT-tier branches all
        // carry an explicit `case "FUTURE_DEVELOPMENT"` so the render
        // matches the INDUSTRIAL pattern (one block per plot, filling
        // most of the plot, no podium/body/crown taper).
        // Founder decision 2026-04-23, supersedes the prior "flat
        // polygon only" rule.


        // ── ZAAHI 3D — minimal version per founder spec (4th attempt) ──
        // ONE feature per parcel. ONE fill-extrusion layer below. The
        // feature carries its own `color` (hex string) and `height`
        // (number > 0) so the layer paint can use plain ["get", "color"]
        // and ["get", "height"] — no match expressions, no kind filters.
        const blg = it.plan?.buildingLimitGeometry;
        const plotRing = (it.geometry as GeoJSON.Polygon).coordinates[0];

        // Footprint: building-limit polygon if DDA has it, else the
        // plot polygon insetted by the founder-spec setback in metres.
        let footprintRing: number[][];
        if (blg && blg.type === "Polygon") {
          footprintRing = blg.coordinates[0];
        } else {
          const setbackM = computeSetbackM(
            it.area,
            landUse,
            it.plan?.setbacks ?? null,
            it.plan?.landUseMix?.[0]?.sub ?? null,
          );
          footprintRing = insetRingByMeters(plotRing, setbackM);
        }

        // Height: prefer maxHeightMeters from DDA, else floors × 3.5,
        // else a per-land-use default. ALWAYS > 0 so the extrusion
        // is visible.
        let totalH = it.plan?.maxHeightMeters ?? 0;
        if (totalH <= 0 && it.plan?.maxFloors) {
          totalH = it.plan.maxFloors * 3.5;
        }
        if (totalH <= 0 && it.plan?.maxGfaSqm && it.plan?.plotAreaSqm) {
          const footprintArea = it.plan.plotAreaSqm * 0.6;
          const floors = Math.ceil(it.plan.maxGfaSqm / footprintArea);
          totalH = floors * 3.5;
        }
        if (totalH <= 0) {
          // Per-land-use fallback heights (metres) so every 3D-eligible
          // parcel renders SOMETHING even when DDA has no height data.
          totalH =
            landUse === "RESIDENTIAL"  ? 15 :
            landUse === "COMMERCIAL"   ? 30 :
            landUse === "MIXED_USE"    ? 40 :
            landUse === "HOTEL"        ? 50 :
            landUse === "HOSPITALITY"  ? 50 :
            landUse === "INDUSTRIAL"   ? 12 :
            landUse === "FUTURE_DEVELOPMENT" ? 16 :
            landUse === "FUTURE DEVELOPMENT" ? 16 :
            landUse === "WAREHOUSE"    ? 12 :
            landUse === "EDUCATIONAL"  ? 12 :
            landUse === "EDUCATION"    ? 12 :
            landUse === "HEALTHCARE"   ? 18 :
            landUse === "AGRICULTURAL" ?  6 :
            landUse === "AGRICULTURE"  ?  6 :
            20;
        }

        const buildingHex = ZAAHI_LANDUSE_COLOR[landUse] ?? ZAAHI_DEFAULT_COLOR;

        // Archetype massing input — RESIDENTIAL + MIXED_USE + HOTEL + COMMERCIAL
        // (founder approved; 2026-06-13/14/15). All other land-uses are
        // intentionally NOT added → they stay on the existing fill-extrusion path
        // unchanged. Same footprint ring + height the fill-extrusion would use.
        if (landUse === "RESIDENTIAL" || landUse === "MIXED_USE" || landUse === "HOTEL" || landUse === "COMMERCIAL" || landUse === "EDUCATIONAL" || landUse === "HEALTHCARE" || landUse === "INDUSTRIAL" || landUse === "AGRICULTURAL" || landUse === "FUTURE_DEVELOPMENT" || landUse === "INVESTMENT") {
          archetypeInputs.push({
            parcelId: it.id,
            footprint: footprintRing,
            plot: plotRing,
            landUse,
            colorHex: buildingHex,
            totalH,
            isVault: it.isVault,
            status: it.status,
          });
        }

        // ── ZAAHI Signature stepped 3D ──
        // Each building is 1, 2, or 3 features depending on height:
        //   floors ≤ 4   → podium only (full footprint, full height)
        //   floors 5-10  → podium (0–14 m) + body (14–top, 70% footprint)
        //   floors > 10  → podium + body (14–top-7) + crown (top-7→top, 50%)
        // All features go into the SAME source and SAME fill-extrusion
        // layer below — no kind filters, no separate layers. Stepped
        // look comes from the ring being scaled toward its centroid.
        const FLOOR_H = 3.5;
        const PODIUM_TOP = 14; // 4 floors
        const CROWN_H = 7;     // top 2 floors
        const floors = Math.max(1, Math.round(totalH / FLOOR_H));

        // Centroid scale of a ring (uniform inset toward its centroid).
        const scaleRingFromCentroid = (ring: number[][], scale: number): number[][] => {
          const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
          const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
          return ring.map(([lng, lat]) => [
            cx + (lng - cx) * scale,
            cy + (lat - cy) * scale,
          ]);
        };

        const pushTier = (ring: number[][], baseM: number, topM: number) => {
          buildingFeatures.push({
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [ring] },
            properties: {
              parcelId: it.id,
              landUse,
              color: buildingHex,
              height: topM,
              base: baseM,
              // Phase 3 vault-only mode filter scopes ZAAHI_BUILDINGS_3D
              // by isVault === true. Tier features must carry the prop
              // or the filter excludes every building when the mode
              // toggles on. Plot features get this via the API; tier
              // features are derived locally so we pass it through.
              isVault: it.isVault,
              // Archie filter_by_status tool (Phase 2 archie client)
              // — same prop on building tiers so the filter scopes
              // both plot polygons and 3D extrusions consistently.
              status: it.status,
            },
          });
        };

        // ── Data-driven style selection ──
        // AffectionPlan.buildingStyle === "FLAT" → single block of full
        // footprint at full height (correct for most commercial office
        // buildings where there is no visual podium/tower distinction).
        // FUTURE_DEVELOPMENT → same flat-block render (founder 2026-04-23:
        // match the INDUSTRIAL pattern regardless of floor count · no
        // podium/body/crown taper for pre-master-plan land).
        // Default/null/"SIGNATURE" → ZAAHI tiered model below.
        // Per-plot opt-in keeps the renderer free of hardcoded plot-number
        // overrides (per CLAUDE.md rule).
        const forceFlat =
          it.plan?.buildingStyle === "FLAT" ||
          landUse === "FUTURE_DEVELOPMENT" ||
          landUse === "FUTURE DEVELOPMENT";
        if (forceFlat) {
          pushTier(footprintRing, 0, totalH);
        } else if (floors <= 4) {
          // Podium only — short building, no taper.
          pushTier(footprintRing, 0, totalH);
        } else if (floors <= 10) {
          // Podium + body. No crown — body extends to the very top.
          pushTier(footprintRing, 0, PODIUM_TOP);
          pushTier(scaleRingFromCentroid(footprintRing, 0.7), PODIUM_TOP, totalH);
        } else {
          // Full ZAAHI Signature — podium + body + crown.
          pushTier(footprintRing, 0, PODIUM_TOP);
          pushTier(scaleRingFromCentroid(footprintRing, 0.7), PODIUM_TOP, totalH - CROWN_H);
          pushTier(scaleRingFromCentroid(footprintRing, 0.5), totalH - CROWN_H, totalH);
        }
      }

      debugLog(
        "[ZAAHI]",
        "plotFeatures:", plotFeatures.length,
        "buildingFeatures:", buildingFeatures.length,
        "(of", payload.items.length, "parcels)",
      );
      // backlog #4 — dynamic listings counter (was hardcoded "114").
      setTotalListings(payload.items.length);

      // Wave 2: surface the distinct district names so the Filter
      // Panel's District multi-select has real options. Listings only —
      // PMTiles tiles don't carry district names today.
      const districts = Array.from(
        new Set(
          plotFeatures
            .map((f) => (f.properties as { district?: string }).district ?? "")
            .filter((d) => d.length > 0),
        ),
      ).sort();
      setAvailableDistricts(districts);
      // Plot source: setData when it already exists (refresh path used
      // after a vault add), else addSource + register all four plot
      // layers (FILL / LINE / GLOW / GLOW_CRISP). The race-guard
      // semantics from the pre-Phase-3 early-return move here — a
      // re-entrant call now just updates data instead of being
      // discarded.
      const plotSrc = map.getSource(ZAAHI_PLOTS_SRC);
      if (plotSrc) {
        (plotSrc as maplibregl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features: plotFeatures,
        });
      } else {
        // Initial filter for the three vault-direction layers
        // (FILL / LINE / BUILDINGS_3D). Baking the composed filter into
        // addLayer prevents the first-paint race where a freshly created
        // layer would render unfiltered for one frame and leak the
        // wrong side of the vault direction (PPV in OFF mode, listings
        // in ON mode). Subsequent toggles travel via reapplyMapFilters.
        const initialFilter = buildZaahiFilter();

        map.addSource(ZAAHI_PLOTS_SRC, {
          type: "geojson",
          data: { type: "FeatureCollection", features: plotFeatures },
        });
        if (!map.getLayer(ZAAHI_PLOTS_FILL)) {
          map.addLayer({
            id: ZAAHI_PLOTS_FILL,
            type: "fill",
            source: ZAAHI_PLOTS_SRC,
            filter: initialFilter,
            paint: {
              "fill-color": ["get", "color"],
              // 0.4 when DDA has assigned a land use, 0 (outline-only) when not.
              "fill-opacity": [
                "case",
                ["==", ["get", "hasLandUse"], true],
                0.4,
                0,
              ],
              "fill-opacity-transition": { duration: 300 },
              "fill-color-transition": { duration: 300 },
            },
          });
        }
        if (!map.getLayer(ZAAHI_PLOTS_LINE)) {
          map.addLayer({
            id: ZAAHI_PLOTS_LINE,
            type: "line",
            source: ZAAHI_PLOTS_SRC,
            filter: initialFilter,
            paint: {
              "line-color": ["get", "color"],
              "line-width": 2,
              "line-opacity-transition": { duration: 300 },
            },
          });
        }
        if (!map.getLayer(ZAAHI_PLOTS_GLOW)) {
          map.addLayer({
            id: ZAAHI_PLOTS_GLOW,
            type: "line",
            source: ZAAHI_PLOTS_SRC,
            filter: ["==", ["id"], "__none__"],
            paint: { "line-color": "#FFD700", "line-width": 6, "line-blur": 8, "line-opacity": 0.9 },
          });
        }
        if (!map.getLayer(ZAAHI_PLOTS_GLOW_CRISP)) {
          map.addLayer({
            id: ZAAHI_PLOTS_GLOW_CRISP,
            type: "line",
            source: ZAAHI_PLOTS_SRC,
            filter: ["==", ["id"], "__none__"],
            paint: { "line-color": "#FFD700", "line-width": 2, "line-opacity": 1 },
          });
        }
      }

      // ── 3D BUILDING EXTRUSION — single layer, single source ──
      // Founder spec (4th attempt fix): one fill-extrusion layer, no
      // per-kind filters, no match expressions, no podium/body/crown
      // tiers. Each feature carries its own `color` (hex string from
      // ZAAHI_LANDUSE_COLOR) and `height` (metres) so the paint can
      // use plain `["get", "color"]` and `["get", "height"]`.
      debugLog("[ZAAHI]", "buildingFeatures count:", buildingFeatures.length);
      const buildingSrc = map.getSource(ZAAHI_BUILDINGS_SRC);
      if (buildingSrc) {
        (buildingSrc as maplibregl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features: buildingFeatures,
        });
      } else {
        debugLog("[ZAAHI]", "addSource:", ZAAHI_BUILDINGS_SRC);
        map.addSource(ZAAHI_BUILDINGS_SRC, {
          type: "geojson",
          data: { type: "FeatureCollection", features: buildingFeatures },
        });
        if (!map.getLayer(ZAAHI_BUILDINGS_3D)) {
          debugLog("[ZAAHI]", "addLayer:", ZAAHI_BUILDINGS_3D, "fill-extrusion", "features:", buildingFeatures.length);
          map.addLayer({
            id: ZAAHI_BUILDINGS_3D,
            type: "fill-extrusion",
            source: ZAAHI_BUILDINGS_SRC,
            // Same direction filter as the plot fill/line — see comment
            // in the plot-source branch above for the first-paint race
            // it prevents.
            filter: buildZaahiFilter(),
            paint: {
              "fill-extrusion-color": ["get", "color"],
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "base"],
              // ZAAHI listings (our 101 parcels) render SOLID so they
              // stand out against the PMTiles background layers which
              // stay at 0.35. Single literal — data expressions are
              // not supported on fill-extrusion-opacity.
              "fill-extrusion-opacity": 1,
            },
          });
        }
      }

      // ── Archetype morphology layer (?archetypes=1) ──────────────────
      // RESIDENTIAL ONLY (founder 2026-06-13): residential listings/vault plots
      // render as Three.js morphology massing (reuses the proven BuildingGlbLayer
      // / signature three-layer matrix + framebuffer pattern); residential is
      // excluded from the fill-extrusion so it doesn't double-render. Every
      // other land-use stays on the existing fill-extrusion, untouched.
      // Default-off in prod (hostname allow-list).
      // Flag read LIVE from the URL at call time (Signature §10 lesson: never
      // via memo/SSR). localStorage fallback survives any auth/SSO redirect that
      // strips the query before loadZaahiPlots runs (also seeded at mount, see
      // the archetypes-flag useEffect). `?archetypes=0` clears it.
      // Resolve precedence: explicit ?archetypes=1/0 → localStorage toggle
      // (Variant B) → preview-host default ON (Variant A) → prod OFF. The query
      // can't be relied on (SSO strips it) so it's only the top override.
      const arSearch =
        typeof window !== "undefined" && window.location ? window.location.search : "";
      const { on: arFlag, via: arVia } = resolveArchetypeFlag();
      // Keep the panel toggle in step when the flag came from the query or the
      // preview-host default (the toggle itself already sets this state).
      setArchetypesOn(arFlag);
      // ALWAYS log (before the gate) so flag activation is observable.
      debugLog(
        "[ZAAHI archetypes] flag check: search=", JSON.stringify(arSearch),
        "· result=", arFlag, "· via=", arVia,
        "· host=", (typeof window !== "undefined" ? window.location.hostname : ""),
        "· zoom=", map.getZoom().toFixed(1),
      );
      archetypeActiveRef.current = arFlag;
      // Flag read by applySelectionPaint to extinguish the residential flat
      // plot-fill ghost under the solid model (founder 2026-06-14, one layer).
      (map as unknown as { __zaahiArchetypeActive?: boolean }).__zaahiArchetypeActive = arFlag;
      if (arFlag) {
        // Founder 2026-06-13/14: RESIDENTIAL + MIXED_USE render as archetype
        // morphology. archetypeInputs is already filtered to those two upstream;
        // every other land-use keeps the existing fill-extrusion, untouched.
        debugLog("[ZAAHI archetypes] ON (RESIDENTIAL+MIXED_USE) · inputs:", archetypeInputs.length);
        if (!archetypeCtrlRef.current) {
          const ctrl = installArchetypeLayer(map);
          archetypeCtrlRef.current = ctrl;
          (map as unknown as { __zaahiArchetypes?: ArchetypeLayerController }).__zaahiArchetypes = ctrl;
          // LOD: show the Three.js massing only at zoom >= ARCHETYPE_MIN_ZOOM
          // and exclude residential from the fill-extrusion only then (else
          // residential renders normally as fill-extrusion). No double-render.
          const applyArchetypeLod = () => {
            const show = archetypeActiveRef.current && map.getZoom() >= ARCHETYPE_MIN_ZOOM;
            archetypeCtrlRef.current?.setEnabled(show);
            if (map.getLayer(ZAAHI_BUILDINGS_3D)) {
              const base = buildZaahiFilter();
              map.setFilter(
                ZAAHI_BUILDINGS_3D,
                show
                  ? (["all", base, ["match", ["get", "landUse"], ["RESIDENTIAL", "MIXED_USE", "HOTEL", "COMMERCIAL", "EDUCATIONAL", "HEALTHCARE", "INDUSTRIAL", "AGRICULTURAL", "FUTURE_DEVELOPMENT", "INVESTMENT"], false, true]] as FilterSpecification)
                  : base,
              );
            }
          };
          map.on("zoom", applyArchetypeLod);
          (map as unknown as { __zaahiArchetypeLod?: () => void }).__zaahiArchetypeLod = applyArchetypeLod;
        }
        archetypeCtrlRef.current.setBuildings(archetypeInputs);
        // Apply LOD now (sets enabled + residential exclusion per current zoom).
        (map as unknown as { __zaahiArchetypeLod?: () => void }).__zaahiArchetypeLod?.();
        // Re-apply the plot-fill paint now that the archetype flag is set so the
        // residential flat-fill ghost is extinguished on first paint (no
        // selection yet → null). ZAAHI_PLOTS_FILL stays click/hover-able.
        applySelectionPaint(map, selectedParcelId);
      } else if (archetypeCtrlRef.current) {
        // OFF branch (Layers toggle turned the flag off after the layer was
        // already installed). Without this the Three.js models stayed drawn
        // and ZAAHI_BUILDINGS_3D stayed filtered — i.e. the archetype hid the
        // Signature extrusion but rendered nothing in its place, and the
        // translucent plot-fill stayed extinguished (the "ghost" plot).
        debugLog("[ZAAHI archetypes] OFF · tearing down overlay");
        archetypeCtrlRef.current.setEnabled(false);
        // Restore the Signature fill-extrusion: drop the land-use exclusion so
        // podium/body/crown renders for every classified listing again.
        if (map.getLayer(ZAAHI_BUILDINGS_3D)) {
          map.setFilter(ZAAHI_BUILDINGS_3D, buildZaahiFilter());
        }
        // __zaahiArchetypeActive is already false above, so this repaint
        // restores the normal translucent plot-fill (no ghost left behind).
        applySelectionPaint(map, selectedParcelId);
      }

      // ── Vault conflict markers (centroid rendering, 2026-08-06) ──
      // One red dot per plot where the caller's vault entry conflicts with
      // another user's entry for the same plot. The features are Points
      // computed above (one centroid per conflicting plot), so the circle
      // layer needs no filter and cannot multiply per vertex — see
      // VAULT_CONFLICT_MARKERS_SRC for the bug this replaces.
      const markerData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: conflictMarkerFeatures,
      };
      const markerSrc = map.getSource(VAULT_CONFLICT_MARKERS_SRC);
      if (markerSrc) {
        // Refresh path (e.g. after a vault add) — data only, layer stays.
        (markerSrc as maplibregl.GeoJSONSource).setData(markerData);
      } else {
        map.addSource(VAULT_CONFLICT_MARKERS_SRC, {
          type: "geojson",
          data: markerData,
        });
      }
      if (!map.getLayer(VAULT_CONFLICT_MARKERS_LAYER)) {
        map.addLayer({
          id: VAULT_CONFLICT_MARKERS_LAYER,
          type: "circle",
          source: VAULT_CONFLICT_MARKERS_SRC,
          // v2 fix (founder spec 2026-05-31): markers must hide when
          // vault polygons are hidden, otherwise red dots float on the
          // map where the underlying VAULT_PRIVATE plot was filtered
          // out. The v1 attempt missed this — root cause of the revert.
          // Toggled in the [vaultOnlyMode] useEffect below.
          layout: {
            visibility: vaultOnlyModeRef.current ? "visible" : "none",
          },
          paint: {
            "circle-radius": 6,
            "circle-color": "#E63946",
            "circle-stroke-color": "#1A1A2E",
            "circle-stroke-width": 2,
            "circle-opacity": 0.9,
          },
        });
      }
    } catch (e) {
      console.error("[zaahi-plots] load failed", e);
    }
  }

  // ── Map filter composition (Phase 2 archie client, 2026-05-30) ──
  //
  // Wave 1 (Filter Panel, 2026-06-02): the same Archie filter refs now
  // also drive the PMTiles overlay (99K DDA + ~362K AD). buildZaahiFilter
  // still composes the 114 ZAAHI listings' filter; the new
  // buildPmtilesFilter (declared next to applyZaahiExclusionToTileLayers
  // below) composes tier-base + ZAAHI plot-number exclusion + the same
  // Archie refs, translated through zaahiStatusToPmtilesValues for the
  // ParcelStatus → CONSTRUCTION_STATUS gap. reapplyMapFilters now also
  // calls applyZaahiExclusionToTileLayers so all 12 layers stay in sync.
  //
  // ONE filter per layer is a maplibre invariant. Four sources of
  // truth feed the composite filter on the ZAAHI plot/building layers:
  //   • vault-mode DIRECTION (always active)   — see below
  //   • Archie filter_by_land_use tool         — landUse === <enum>
  //   • Archie filter_by_status tool           — status === <enum>
  //
  // Vault-mode direction (founder spec 2026-05-31 v2):
  //   OFF (default): isVault !== true → public listings only,
  //                  caller's VAULT_PRIVATE plots hidden.
  //   ON  (lock):    isVault === true → caller's PPV only,
  //                  public listings hidden.
  // Because the direction filter is always active, buildZaahiFilter
  // never returns null. The v1 attempt (commit 485711e) put the
  // direction flip inline in the useEffect; v2 folds it into the
  // composer so Archie's filter_by_land_use / filter_by_status tools
  // continue to compose cleanly via ["all", …].
  //
  // reapplyMapFilters reads the three refs + maps over the three
  // affected layers. Safe to call multiple times — setFilter replaces
  // the prior filter atomically.
  function buildZaahiFilter(): FilterSpecification {
    const direction: FilterSpecification = vaultOnlyModeRef.current
      ? ["==", ["get", "isVault"], true]
      : ["!=", ["get", "isVault"], true];
    const parts: FilterSpecification[] = [direction];

    // ── Land use multi-select (461K + 114 — shared filter ref)
    if (filterLandUseRef.current.length > 0) {
      parts.push([
        "in",
        ["get", "landUse"],
        ["literal", filterLandUseRef.current],
      ] as FilterSpecification);
    }

    // ── Unified status → ZAAHI ParcelStatus list (multi-side mapping)
    if (filterUnifiedStatusRef.current.length > 0) {
      const zaahiList = unifiedToZaahiStatusList(filterUnifiedStatusRef.current);
      if (zaahiList === null) {
        // Selection is exclusively DDA-only chips (Built / Under
        // construction) — listings carry no equivalent state, hide all.
        parts.push(["literal", false] as FilterSpecification);
      } else if (zaahiList.length > 0) {
        parts.push([
          "in",
          ["get", "status"],
          ["literal", zaahiList],
        ] as FilterSpecification);
      }
    }

    // ── Plot area range (sqft) — listings have plotAreaSqft
    if (filterAreaRangeRef.current) {
      const { min, max } = filterAreaRangeRef.current;
      parts.push([">=", ["get", "plotAreaSqft"], min] as FilterSpecification);
      parts.push(["<=", ["get", "plotAreaSqft"], max] as FilterSpecification);
    }

    // ── GFA range (sqft) — listings have maxGfaSqft
    if (filterGfaRangeRef.current) {
      const { min, max } = filterGfaRangeRef.current;
      parts.push([">=", ["get", "maxGfaSqft"], min] as FilterSpecification);
      parts.push(["<=", ["get", "maxGfaSqft"], max] as FilterSpecification);
    }

    // ── FAR range — listings have far pre-stored
    if (filterFarRangeRef.current) {
      const { min, max } = filterFarRangeRef.current;
      parts.push([">=", ["get", "far"], min] as FilterSpecification);
      parts.push(["<=", ["get", "far"], max] as FilterSpecification);
    }

    // ── Price range (AED) — LISTINGS ONLY (PMTiles has no price)
    if (filterPriceRangeRef.current) {
      const { min, max } = filterPriceRangeRef.current;
      parts.push([">=", ["get", "priceAed"], min] as FilterSpecification);
      parts.push(["<=", ["get", "priceAed"], max] as FilterSpecification);
    }

    // ── District multi-select — LISTINGS ONLY (PMTiles base props
    //    don't carry district name; would need a tile re-bake)
    if (filterDistrictsRef.current.length > 0) {
      parts.push([
        "in",
        ["get", "district"],
        ["literal", filterDistrictsRef.current],
      ] as FilterSpecification);
    }

    if (parts.length === 1) return parts[0];
    return ["all", ...parts] as FilterSpecification;
  }
  function reapplyMapFilters() {
    const map = mapRef.current;
    if (!map) return;
    const expr = buildZaahiFilter();
    for (const lid of [ZAAHI_PLOTS_FILL, ZAAHI_PLOTS_LINE, ZAAHI_BUILDINGS_3D]) {
      if (map.getLayer(lid)) {
        // Exclude residential from the 3D fill-extrusion ONLY while the
        // archetype massing is actually showing (active AND zoom >= min) —
        // otherwise residential renders normally as fill-extrusion (LOD).
        // Plot fill/line keep all types for click/hover/search.
        if (
          lid === ZAAHI_BUILDINGS_3D &&
          archetypeActiveRef.current &&
          map.getZoom() >= ARCHETYPE_MIN_ZOOM
        ) {
          map.setFilter(lid, ["all", expr, ["match", ["get", "landUse"], ["RESIDENTIAL", "MIXED_USE", "HOTEL", "COMMERCIAL", "EDUCATIONAL", "HEALTHCARE", "INDUSTRIAL", "AGRICULTURAL", "FUTURE_DEVELOPMENT", "INVESTMENT"], false, true]] as FilterSpecification);
        } else {
          map.setFilter(lid, expr);
        }
      }
    }
    // Archetype layer filter parity (?archetypes=1): reuse the SAME filter
    // expression via querySourceFeatures (no JS reimplementation) to get the
    // passing parcelIds, then drive the CustomLayer mesh visibility.
    const ac = archetypeCtrlRef.current;
    if (ac && map.getSource(ZAAHI_PLOTS_SRC)) {
      try {
        const passing = new Set<string>();
        for (const feat of map.querySourceFeatures(ZAAHI_PLOTS_SRC, { filter: expr })) {
          const id = (feat.properties as { id?: string } | null)?.id;
          if (id) passing.add(id);
        }
        ac.setVisibility((pid) => passing.has(pid));
      } catch { /* querySourceFeatures can throw mid-style-swap — ignore */ }
    }
    // Wave 1: propagate Archie landUse/status filters to PMTiles too.
    // applyZaahiExclusionToTileLayers now composes everything (tier base
    // + ZAAHI exclusion + Archie filters) via buildPmtilesFilter, so
    // calling it here keeps the 9 PMTiles layers in sync with the 3
    // ZAAHI layers we just updated.
    applyZaahiExclusionToTileLayers(map);
  }

  // ── Private Plot Vault — Phase 3 (2026-05-30) ────────────────────
  //
  // Owner-side vault entries (the caller's own VAULT_PRIVATE plots)
  // now flow through the unified loadZaahiPlots above. Only the
  // shared-to-me layer keeps its own source/loader here — see
  // loadVaultShared below. Visual treatment for shares: fill colour
  // by stage, fill-extrusion-opacity 0.55 (literal). Conflict markers
  // moved to ZAAHI_PLOTS_SRC (see loadZaahiPlots).
  //
  // loadVaultShared is a no-op when the API returns 401 (user signed
  // out mid-session) — the route is auth-gated.

  /** Load entries shared TO the caller onto the VAULT_SHARED_3D layer. */
  async function loadVaultShared(map: MLMap) {
    try {
      const r = await apiFetch("/api/vault/shared-with-me/map");
      if (!r.ok) {
        if (r.status !== 401) console.error("[vault-shared] fetch:", r.status);
        return;
      }
      const data = (await r.json()) as GeoJSON.FeatureCollection;

      // Tier expansion (1–3 features per entry): DDA-resolved →
      // ZAAHI Signature podium/body/crown via emitSignatureTiers;
      // non-DDA polygon → flat 30 m block; placeholder lat/lng → 3 m
      // mini-block at the synthesised 5 m square. tierIndex===0 filter
      // on conflict-marker layer (when wired) so multi-tier entries
      // get exactly one marker.
      const features: GeoJSON.Feature[] = [];
      for (const f of data.features) {
        if (!f.geometry || f.geometry.type !== "Polygon") continue;
        const props = (f.properties ?? {}) as Record<string, unknown>;
        const stage = String(props.stage ?? "LEAD");
        const placeholder = props.placeholder === true;
        const plan = (props.affectionPlan ?? null) as {
          maxFloors?: number | null;
          maxHeightMeters?: number | null;
          maxHeightCode?: string | null;
          far?: number | null;
          plotAreaSqft?: number | null;
          maxGfaSqft?: number | null;
          projectName?: string | null;
          sitePlanIssue?: string | null;
          buildingLimitGeometry?: GeoJSON.Polygon | null;
          setbacks?: SetbackEntry[] | null;
          landUseMix?: Array<{ category: string; sub?: string | null }> | null;
          buildingStyle?: string | null;
        } | null;

        // Land-use colour parity with public listings (founder spec
        // 2026-05-30). Stage tone moves to the SidePanel pipeline block.
        const landUseKey =
          deriveLandUse(plan?.landUseMix) ??
          (typeof props.landUse === "string" && props.landUse
            ? props.landUse.toUpperCase().replace(/[ -]+/g, "_")
            : null);
        const color = (landUseKey && ZAAHI_LANDUSE_COLOR[landUseKey]) ?? ZAAHI_DEFAULT_COLOR;
        const baseProps = {
          ...props,
          color,
          stage,
          landUse: landUseKey ?? "",
          projectName: plan?.projectName ?? "",
          maxFloors: plan?.maxFloors ?? 0,
          maxHeightCode: plan?.maxHeightCode ?? "",
          maxHeightMeters: plan?.maxHeightMeters ?? 0,
          far: plan?.far ?? 0,
          plotAreaSqft: plan?.plotAreaSqft ?? 0,
          maxGfaSqft: plan?.maxGfaSqft ?? 0,
          planDateIso: plan?.sitePlanIssue ?? "",
        };

        if (placeholder) {
          features.push({
            type: "Feature",
            geometry: f.geometry,
            properties: { ...baseProps, height: 3, base: 0, tierIndex: 0 },
          });
          continue;
        }

        if (plan) {
          const tiers = emitSignatureTiers({
            plotPolygon: f.geometry as GeoJSON.Polygon,
            landUse: (typeof props.landUse === "string" && props.landUse) ? props.landUse : null,
            areaSqft: typeof props.area === "number" ? props.area : null,
            buildingLimitGeometry: (plan.buildingLimitGeometry ?? null) as GeoJSON.Polygon | null,
            setbacks: plan.setbacks ?? null,
            maxHeightMeters: plan.maxHeightMeters ?? null,
            maxFloors: plan.maxFloors ?? null,
            landUseSub: plan.landUseMix?.[0]?.sub ?? null,
            buildingStyle: plan.buildingStyle ?? null,
          });
          tiers.forEach((t, idx) => {
            features.push({
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [t.ring] },
              properties: { ...baseProps, height: t.topMeters, base: t.baseMeters, tierIndex: idx },
            });
          });
          continue;
        }

        features.push({
          type: "Feature",
          geometry: f.geometry,
          properties: { ...baseProps, height: 30, base: 0, tierIndex: 0 },
        });
      }

      if (map.getSource(VAULT_SHARED_SRC)) {
        (map.getSource(VAULT_SHARED_SRC) as maplibregl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features,
        });
      } else {
        map.addSource(VAULT_SHARED_SRC, {
          type: "geojson",
          data: { type: "FeatureCollection", features },
        });
      }

      if (!map.getLayer(VAULT_SHARED_3D)) {
        map.addLayer({
          id: VAULT_SHARED_3D,
          type: "fill-extrusion",
          source: VAULT_SHARED_SRC,
          layout: { visibility: "none" },
          paint: {
            "fill-extrusion-color": ["get", "color"],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "base"],
            "fill-extrusion-opacity": 1, // listing parity — solid (founder 2026-05-30)
          },
        });
      }
    } catch (e) {
      console.error("[vault-shared] load failed:", e);
    }
  }

  // ── PMTiles: DDA + AD Land Plots ─────────────────────────────────
  // Pre-built vector tiles served from /tiles/*.pmtiles (static files).
  // 99K DDA + 362K AD plots with color/height/landUse pre-computed.
  // Added to the map once in the "load" handler; toggled via layout visibility.

  const DDA_LAND_TILES_SRC = "dda-land-tiles";
  const DDA_LAND_TILES_FILL = "dda-land-tiles-fill";
  const DDA_LAND_TILES_LINE = "dda-land-tiles-line";
  const DDA_LAND_TILES_3D = "dda-land-tiles-3d";
  // AD split into two <100MB files (Vercel / GitHub 100MB limit, no LFS)
  const AD_ADM_TILES_SRC = "ad-adm-tiles";
  const AD_ADM_TILES_FILL = "ad-adm-tiles-fill";
  const AD_ADM_TILES_LINE = "ad-adm-tiles-line";
  const AD_ADM_TILES_3D = "ad-adm-tiles-3d";
  const AD_OTHER_TILES_SRC = "ad-other-tiles";
  const AD_OTHER_TILES_FILL = "ad-other-tiles-fill";
  const AD_OTHER_TILES_LINE = "ad-other-tiles-line";
  const AD_OTHER_TILES_3D = "ad-other-tiles-3d";
  // Oman PMTiles consts removed 2026-05-24 — Saudi + Oman coverage
  // dropped from the platform. data/tiles/oman-plots.geojson.nl and
  // the R2 oman-land.pmtiles object stay around as orphans; remove
  // them in a separate dataset-cleanup pass if/when desired.

  /**
   * Re-apply each PMTiles layer's base filter (tier=flat / tier!=flat)
   * combined with a NOT-IN-zaahiPlotNumbers exclusion. Called from
   * loadZaahiPlots after the ZAAHI plot-number set is populated.
   *
   * Idempotent — safe to call repeatedly. Layers that aren't on the map
   * yet (basemap swap mid-flight) are silently skipped; the next time
   * loadZaahiPlots runs after a swap they'll be re-filtered.
   *
   * Without this, ZAAHI's curated SIGNATURE 3D buildings (opacity 1)
   * and the matching PMTiles background features (opacity 0.35) render
   * on top of each other on all 114 curated plots — visible as a
   * darker / double-shadowed silhouette around our listings.
   */
  // Exclude ZAAHI plot numbers from the PMTiles fill/line/3D layers so
  // the curated SIGNATURE buildings and the PMTiles background don't
  // double-stack. The exclusion set is now SYMMETRIC — it excludes
  // exactly the side ZAAHI is currently rendering:
  //
  //   OFF (ZAAHI renders listings): exclude listingsPnSet
  //                                  → vault polygons fall through to
  //                                    PMTiles as background, filling
  //                                    the visual gap left by the
  //                                    direction-hidden vault row.
  //   ON  (ZAAHI renders PPV):      exclude vaultPnSet
  //                                  → listing polygons fall through to
  //                                    PMTiles as background, filling
  //                                    the gap left by the hidden
  //                                    listing row.
  //
  // Founder spec 2026-05-31 (symmetric revision): the prior "vault
  // numbers ALWAYS excluded for privacy" was over-cautious. The vault
  // data (price, owner contacts, broker notes, stage) lives in the
  // vault tables and is gated by auth + ownership; the *plot itself*
  // on the map is already public DDA registry data — observable to
  // anyone with the parcel layer enabled, vault or not. So letting
  // PMTiles paint the plot as an ordinary DDA background polygon when
  // ZAAHI doesn't render it leaks nothing the public registry doesn't
  // already publish.
  //
  // Reads vaultOnlyModeRef + the two split refs — both kept in sync by
  // loadZaahiPlots and the vault-only useEffect. Safe to call from
  // either; setFilter atomically replaces the previous filter.
  // Compose one PMTiles layer's full filter: tier base + ZAAHI plot-
  // number exclusion + active filter dimensions. layerKind selects the
  // tier predicate (FILL/LINE draw "flat" features; 3D draws non-flat
  // podium/body/crown tiers). Called from applyZaahiExclusionToTileLayers
  // — which itself runs both after loadZaahiPlots populates the
  // exclusion sets AND after reapplyMapFilters whenever an Archie /
  // panel filter mutation happens.
  //
  // Wave 2 (2026-06-02) extensions over Wave 1: multi-valued land use,
  // multi-valued unified-status (translated to DDA CONSTRUCTION_STATUS
  // strings via unifiedToPmtilesStatusList), plot area + GFA + FAR
  // sliders. Price + district are listings-only and NOT applied here.
  // Status translation lives in src/lib/filter-state.ts (shared with
  // the panel and the buildZaahiFilter side).
  //
  // GFA conversion: panel exposes GFA in sqft (UAE standard); PMTiles
  // store gfaSqm only. We convert the threshold sqft → sqm inline
  // (1 sqft = 0.0929 sqm; we divide by 10.7639 — the inverse).
  //
  // FAR: derived runtime as gfaSqm / areaSqm. Plots without GFA data
  // (gfaSqm = 0) are excluded from the FAR filter by the guard.
  function buildPmtilesFilter(layerKind: "fill" | "line" | "3d"): FilterSpecification {
    const tierBase: FilterSpecification = layerKind === "3d"
      ? ["!=", ["get", "tier"], "flat"]
      : ["==", ["get", "tier"], "flat"];

    const excludeSet = vaultOnlyModeRef.current
      ? new Set<string>(zaahiVaultPnRef.current)
      : new Set<string>(zaahiListingPnRef.current);
    const exclude: FilterSpecification = [
      "!",
      ["in", ["get", "plotNumber"], ["literal", [...excludeSet]]],
    ];

    const parts: FilterSpecification[] = [tierBase, exclude];

    // ── Land use multi-select
    if (filterLandUseRef.current.length > 0) {
      parts.push([
        "in",
        ["get", "landUse"],
        ["literal", filterLandUseRef.current],
      ] as FilterSpecification);
    }

    // ── Unified status → DDA CONSTRUCTION_STATUS list
    if (filterUnifiedStatusRef.current.length > 0) {
      const ddaList = unifiedToPmtilesStatusList(filterUnifiedStatusRef.current);
      if (ddaList === null) {
        // Selection is exclusively ZAAHI-only chips (In deal / Sold) —
        // PMTiles registry can't satisfy, hide all.
        parts.push(["literal", false] as FilterSpecification);
      } else if (ddaList.length > 0) {
        parts.push([
          "in",
          ["get", "status"],
          ["literal", ddaList],
        ] as FilterSpecification);
      }
    }

    // ── Plot area range (sqft) — PMTiles has areaSqft directly
    if (filterAreaRangeRef.current) {
      const { min, max } = filterAreaRangeRef.current;
      parts.push([">=", ["get", "areaSqft"], min] as FilterSpecification);
      parts.push(["<=", ["get", "areaSqft"], max] as FilterSpecification);
    }

    // ── GFA range (sqft) — PMTiles store gfaSqm; convert threshold
    //    sqft → sqm by dividing by 10.7639 to compare against gfaSqm
    if (filterGfaRangeRef.current) {
      const { min, max } = filterGfaRangeRef.current;
      const minSqm = min / 10.7639;
      const maxSqm = max / 10.7639;
      parts.push([">=", ["get", "gfaSqm"], minSqm] as FilterSpecification);
      parts.push(["<=", ["get", "gfaSqm"], maxSqm] as FilterSpecification);
    }

    // ── FAR derived (gfaSqm / areaSqm) with div-by-zero guard
    if (filterFarRangeRef.current) {
      const { min, max } = filterFarRangeRef.current;
      parts.push([">", ["get", "areaSqm"], 0] as FilterSpecification);
      parts.push([">", ["get", "gfaSqm"], 0] as FilterSpecification);
      parts.push([
        ">=",
        ["/", ["get", "gfaSqm"], ["get", "areaSqm"]],
        min,
      ] as FilterSpecification);
      parts.push([
        "<=",
        ["/", ["get", "gfaSqm"], ["get", "areaSqm"]],
        max,
      ] as FilterSpecification);
    }

    // Price + district are NOT applied to PMTiles — those fields
    // simply don't exist in the tile properties. The realtor-facing
    // panel makes that explicit through the "LISTINGS ONLY · 114"
    // divider above those two sections.

    return ["all", ...parts] as FilterSpecification;
  }

  function applyZaahiExclusionToTileLayers(map: MLMap) {
    const FILL_LAYERS = [DDA_LAND_TILES_FILL, AD_ADM_TILES_FILL, AD_OTHER_TILES_FILL];
    const LINE_LAYERS = [DDA_LAND_TILES_LINE, AD_ADM_TILES_LINE, AD_OTHER_TILES_LINE];
    const EXT_LAYERS  = [DDA_LAND_TILES_3D,   AD_ADM_TILES_3D,   AD_OTHER_TILES_3D];

    for (const id of FILL_LAYERS) {
      if (!map.getLayer(id)) continue;
      map.setFilter(id, buildPmtilesFilter("fill"));
    }
    for (const id of LINE_LAYERS) {
      if (!map.getLayer(id)) continue;
      map.setFilter(id, buildPmtilesFilter("line"));
    }
    for (const id of EXT_LAYERS) {
      if (!map.getLayer(id)) continue;
      map.setFilter(id, buildPmtilesFilter("3d"));
    }
  }

  function addLandTileSource(map: MLMap, srcId: string, fillId: string, lineId: string, extId: string, tilesUrl: string) {
    if (map.getSource(srcId)) return;
    // maxzoom: 18 — tippecanoe builds these tilesets with
    // --maximum-zoom=18 (see scripts/update-tiles.sh) as of 2026-05-24,
    // and the source value matches so MapLibre uses the deepest
    // physical tile directly without any overzoom stretch. Earlier
    // attempts pushed the source/camera to 22 then 24 against a z16
    // tile cap, which forced 6–8 levels of overzoom = 64–256× stretch:
    // (a) tippecanoe's default 5px clip buffer collapsed to ~0px so
    // polygons near tile edges dropped out, (b) the camera near-plane
    // crowded against building tops and fill-extrusion geometry got
    // culled entirely. Bump in lockstep with the Map constructor
    // maxZoom (currently 18 too) and the tippecanoe --maximum-zoom in
    // scripts/update-tiles.sh on any deeper rebuild.
    //
    // tilesUrl is a path like "/tiles/dda-land.pmtiles". The PMTiles
    // assets live on Cloudflare R2 in production; NEXT_PUBLIC_TILES_BASE_URL
    // (set on Vercel to https://pub-eb193cdc5fe84cc6aac0373ef3dfa069.r2.dev)
    // prefixes the URL there. Unset → empty prefix → relative path,
    // which is what docker-compose self-host or any developer who
    // still has the files locally needs. The .pmtiles themselves are
    // gitignored as of 2026-05-24 (see docs/r2-migration-plan.md +
    // memory project_pmtiles_overzoom_band for the rebuild history).
    const tilesBase = process.env.NEXT_PUBLIC_TILES_BASE_URL ?? "";
    const fullTilesUrl = tilesUrl.startsWith("http") ? tilesUrl : `${tilesBase}${tilesUrl}`;
    map.addSource(srcId, { type: "vector", url: `pmtiles://${fullTilesUrl}`, maxzoom: 18 });
    // 2D fill — only "flat" features (tier=flat, height=0)
    map.addLayer({ id: fillId, type: "fill", source: srcId, "source-layer": "plots", minzoom: 10, layout: { visibility: "none" },
      filter: ["==", ["get", "tier"], "flat"],
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.1, 13, 0.35],
    }});
    // 2D line — only "flat" features
    map.addLayer({ id: lineId, type: "line", source: srcId, "source-layer": "plots", minzoom: 12, layout: { visibility: "none" },
      filter: ["==", ["get", "tier"], "flat"],
      paint: {
        "line-color": ["get", "color"], "line-width": 1, "line-opacity": 0.6,
    }});
    // 3D extrusion — only tier features (podium/body/crown).
    // maxzoom: 24 is MapLibre's default cap but is set explicitly here
    // to document that we want the layer rendered all the way down,
    // so a future edit can't silently shrink the visible zoom band.
    map.addLayer({ id: extId, type: "fill-extrusion", source: srcId, "source-layer": "plots", minzoom: 14, maxzoom: 24, layout: { visibility: "none" },
      filter: ["!=", ["get", "tier"], "flat"],
      paint: {
        "fill-extrusion-color": ["get", "color"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-opacity": 0.45,
    }});
    // Hover — bindLayerEvent clears any previous binding for this
    // (event, layer) pair so style swaps don't pile up extra hover
    // callbacks. Same guard as the listeners in attachOverlays.
    bindLayerEvent(map, "mousemove", fillId, (e0: unknown) => {
      const e = e0 as MapMouseEvent & { features?: GeoJSON.Feature[] };
      const f = e.features?.[0];
      if (!f) return;
      // Priority: ZAAHI listings + shared-vault outrank PMTiles. If the
      // cursor is over either of those layers at this frame, defer —
      // those handlers fire on the same event and have their own popup.
      // Avoids the dual-popup overlap (e.g. "Business Bay" ZAAHI listing
      // stacked with "3460730 Open Space" PMTiles polygon).
      const blockingLayers = [ZAAHI_PLOTS_FILL, VAULT_SHARED_3D].filter(
        (lid) => map.getLayer(lid),
      );
      if (blockingLayers.length > 0) {
        const upper = map.queryRenderedFeatures(e.point, { layers: blockingLayers });
        if (upper.length > 0) {
          setDdaLandHover(null);
          return;
        }
      }
      // Re-hovering after a brief mouseleave cancels the pending close
      // so the popup stays alive through the keep-alive window.
      if (hoverCloseTimerRef.current != null) {
        window.clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
      map.getCanvas().style.cursor = "pointer";
      // Symmetric hover dedup (founder spec 2026-05-31): when PMTiles
      // activates, kill ZAAHI + vault state too. The priority gate
      // above only checks whether the cursor is STILL over ZAAHI on
      // this frame — it does NOT clear stale state from a sibling
      // ZAAHI polygon whose 220ms close timer was just cancelled by
      // our hoverCloseTimerRef clear above. Without this, dragging
      // from "Business Bay Phase 1" onto adjacent DDA 3460654 leaves
      // both cards stacked.
      setZaahiHover(null);
      setVaultHover(null);
      const pr = f.properties as Record<string, unknown>;
      const areaSqm = (pr.areaSqm as number) ?? 0;
      // DDA tiles carry AREA_SQFT directly; AD tiles only have
      // CALCULATEDAREA (in sqm) — derive sqft via 10.7639.
      const areaSqft = (pr.areaSqft as number) || Math.round(areaSqm * 10.7639);
      const gfaSqm = (pr.gfaSqm as number) ?? 0;
      const gfaSqft = gfaSqm > 0 ? Math.round(gfaSqm * 10.7639) : 0;
      setDdaLandHover({
        x: e.point.x, y: e.point.y,
        plotNumber: (pr.plotNumber as string) ?? "",
        mainLandUse: ((pr.mainLandUse as string) || (pr.primaryUse as string)) ?? "",
        areaSqm, areaSqft, gfaSqm, gfaSqft,
        status: (pr.status as string) ?? "",
        source: ((pr.source as string) ?? "") as "dda" | "ad" | "",
        municipality: (pr.municipality as string) ?? "",
        district: (pr.district as string) ?? "",
      });
      // Kill the shared boundary native popup too (see ZAAHI handler).
      popupRef.current?.remove();
    });
    // Delayed close — the hover card now has interactive content ("+"
    // button), so leaving the PMTiles polygon shouldn't instantly kill
    // the popup. 220ms window matches the zaahiHover pattern and is
    // cancellable by the popup's onMouseEnter.
    bindLayerEvent(map, "mouseleave", fillId, () => {
      map.getCanvas().style.cursor = "";
      if (hoverCloseTimerRef.current != null) {
        window.clearTimeout(hoverCloseTimerRef.current);
      }
      hoverCloseTimerRef.current = window.setTimeout(() => {
        setDdaLandHover(null);
        hoverCloseTimerRef.current = null;
      }, 220);
    });
  }

  function setLandTileVisibility(map: MLMap, fillId: string, lineId: string, extId: string, on: boolean) {
    const v = on ? "visible" : "none";
    if (map.getLayer(fillId)) map.setLayoutProperty(fillId, "visibility", v);
    if (map.getLayer(lineId)) map.setLayoutProperty(lineId, "visibility", v);
    if (map.getLayer(extId)) map.setLayoutProperty(extId, "visibility", v);
  }


  // Amenity icons — SDF-rendered symbol images for the 4 point overlays.
  // setStyle() wipes the image registry along with sources/layers, so this
  // is called both on initial map load AND inside the theme-swap styledata
  // handler, before attachOverlays runs the symbol-layer addLayer calls.
  // Idempotent: skips images already registered.
  const AMENITY_ICONS = [
    { id: "amenity-ev-charger",     url: "/icons/amenities/ev-charger.svg" },
    { id: "amenity-metro-station",  url: "/icons/amenities/metro.svg" },
    { id: "amenity-tram-station",   url: "/icons/amenities/tram.svg" },
    { id: "amenity-marine-station", url: "/icons/amenities/marine-station.svg" },
  ] as const;

  async function loadAmenityIcons(map: MLMap): Promise<void> {
    await Promise.all(
      AMENITY_ICONS.map(({ id, url }) => {
        if (map.hasImage(id)) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const img = new Image(64, 64);
          img.onload = () => {
            if (!map.hasImage(id)) {
              map.addImage(id, img, { sdf: true, pixelRatio: 2 });
            }
            resolve();
          };
          img.onerror = () => {
            debugWarn(`[amenity-icon] failed to load ${url}`);
            resolve();
          };
          img.src = url;
        });
      }),
    );
  }

  // Load all overlay layers onto a fresh style. Idempotent: won't re-add
  // sources that already exist (each call after setStyle attaches fresh).
  /**
   * @param opts.reattach  true when the style registry was just wiped (basemap
   *   swap, WebGL context restore) and every source must be rebuilt from
   *   scratch. false/absent on the initial attach.
   */
  async function attachOverlays(map: MLMap, opts: { reattach?: boolean } = {}) {
    // Eagerly load base layers (Communities + Roads) and any layer that
    // is currently toggled on. DDA districts are NOT loaded here — they
    // are lazy and only fetched on first toggle. Master plans are
    // queued by the map-init useEffect (after a 2-second idle) and by
    // the layers toggle effect when the user explicitly enables them.
    // This function is also called after a basemap swap to re-attach
    // every layer that was previously loaded.
    const layers = layersRef.current;
    for (const def of LAYER_REGISTRY) {
      const wantOn = !!layers[def.key];
      const wasLoaded = loadedLayersRef.current.has(def.key);
      // Only re-load layers the user has enabled (or that were already
      // loaded in this session). Base layers used to be eagerly loaded
      // but the founder spec (2026-04-15) moved defaults to OFF so every
      // layer except ZAAHI listings is lazy now.
      if (wantOn || wasLoaded) {
        // Forget the load only when the style registry really was wiped.
        // Clearing unconditionally made every enabled overlay fetch twice on
        // a cold load: the [layers] effect runs on mount (mapRef.current is
        // already set by then, same ordering that caused the [baseMap]
        // duplicate) and loads the layer, then the map-init `load` handler
        // reached here, deleted that record and fetched the same GeoJSON
        // again. loadLayer's in-flight guard could not collapse them because
        // the two are sequential, not concurrent.
        if (opts.reattach) loadedLayersRef.current.delete(def.key);
        await loadLayer(map, def);
        await setLayerVisibility(map, def, wantOn);
      }
    }
    // District-name centroid symbol layer. Always re-attached after
    // attachOverlays so a basemap swap doesn't drop the labels.
    await ensureDistrictNamesLayer(map);
  }

  // ── District-name labels ───────────────────────────────────────────
  // Computes one Point feature per community polygon (centroid of the
  // outer ring) and adds a symbol layer rendering the English community
  // name (`CNAME_E`). Run on map init + after every basemap swap. The
  // centroid features are cached in a ref so re-attaching after a
  // setStyle doesn't trigger a refetch.
  async function ensureDistrictNamesLayer(map: MLMap) {
    if (!districtNameFeaturesRef.current) {
      try {
        const r = await apiFetch("/api/layers/communities");
        if (!r.ok) return;
        const fc = (await r.json()) as GeoJSON.FeatureCollection<GeoJSON.Polygon>;
        const feats: GeoJSON.Feature<GeoJSON.Point>[] = [];
        for (const f of fc.features) {
          if (f.geometry?.type !== "Polygon") continue;
          const ring = f.geometry.coordinates[0];
          if (!ring?.length) continue;
          let sx = 0;
          let sy = 0;
          for (const p of ring) { sx += p[0]; sy += p[1]; }
          const name = (f.properties?.CNAME_E as string | undefined) ?? "";
          if (!name) continue;
          feats.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [sx / ring.length, sy / ring.length] },
            properties: { name },
          });
        }
        districtNameFeaturesRef.current = feats;
      } catch {
        return; // Best-effort — silent failure leaves the layer dormant.
      }
    }
    if (!map.getSource(DISTRICT_NAMES_SRC)) {
      map.addSource(DISTRICT_NAMES_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: districtNameFeaturesRef.current },
      });
    }
    if (!map.getLayer(DISTRICT_NAMES_LAYER)) {
      map.addLayer({
        id: DISTRICT_NAMES_LAYER,
        type: "symbol",
        source: DISTRICT_NAMES_SRC,
        minzoom: 11,
        layout: {
          "text-field": ["get", "name"],
          // 2026-05-24 fix: when text-font is unspecified, MapLibre
          // falls back to ["Open Sans Regular", "Arial Unicode MS
          // Regular"]. The openmaptiles glyph CDN returns text/html
          // (not protobuf) for "Arial Unicode MS Regular", which
          // makes MapLibre throw "Unimplemented type: 4" on every
          // glyph range and force-fall-back to local Canvas2D
          // rendering. Pinning to ["Open Sans Semibold"] (which
          // returns valid PBF) skips the broken fallback chain.
          "text-font": ["Open Sans Semibold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 16, 16],
          "text-letter-spacing": 0.06,
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          visibility: layersRef.current.districtNames ? "visible" : "none",
        },
        paint: {
          "text-color": "#1A1A2E",
          "text-halo-color": "rgba(255,255,255,0.85)",
          "text-halo-width": 1.5,
        },
      });
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // Register PMTiles protocol for vector tile sources
    const pmtilesProtocol = new Protocol();
    maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);

    // Restore saved camera (zoom / center / bearing / pitch) from prior
    // session. localStorage key "zaahi-map-view". Falls back to Dubai
    // defaults if absent / malformed. Layers state is restored in a
    // separate effect below — has to wait for layers' initial useState.
    const saved = loadSavedMapView();
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLES.light,
      center: saved?.center ?? [55.27, 25.20],
      zoom: saved?.zoom ?? 12,
      pitch: saved?.pitch ?? 45,
      bearing: saved?.bearing ?? -17,
      maxPitch: 70,
      // maxZoom: 18 — matches PMTiles overzoom band (source maxzoom 18
      // in addLandTileSource). MapLibre default is 22; lifting it
      // higher (we tried 24) caused PMTiles 3D buildings to vanish
      // because tippecanoe caps tiles at z16 and at >18 the overzoom
      // factor collapses the clip buffer + crowds the camera near-
      // plane against building tops. Founder fix 2026-05-23
      // (overzoom-band correction). Bump in lockstep with the source
      // maxzoom in addLandTileSource if PMTiles are rebuilt deeper.
      maxZoom: 18,
      dragRotate: true,
      pitchWithRotate: true,
      touchPitch: true,
      // 2026-06-11 (Phase 2 feat/keyboard-nav): disable MapLibre's
      // built-in keyboard handler so arrow keys / +/- / shift+drag
      // pan don't conflict with the new src/lib/keyboard-nav.ts
      // controller. Mouse/touch interactions stay default.
      keyboard: false,
      // Required so `map.getCanvas().toDataURL()` returns a non-blank image
      // — used by the Site Plan PDF generator. WebGL otherwise clears the
      // drawing buffer after each frame. MapLibre v5 moved this flag into
      // `canvasContextAttributes`. Negligible perf impact.
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();
    // map.keyboard.enable() removed 2026-06-11 — handler disabled
    // at construction (see keyboard:false above). keyboard-nav.ts
    // installs window-level listeners that drive the camera instead.
    // map.on("zoom" / "rotate") → setState mirrors removed 2026-06-11
    // (perf fix on feat/keyboard-nav). See the matching comment above
    // the deleted useState declarations. MapZoomReadout + MapCompassIcon
    // own their own rAF loops and read mapRef live.

    // Debounced save on every camera change. moveend fires for pan/zoom/
    // rotate/pitch combined so a single listener catches all of them.
    let saveTimer: number | null = null;
    function scheduleSave() {
      if (saveTimer) window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        const c = map.getCenter();
        saveMapView({
          center: [c.lng, c.lat],
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        });
      }, 500);
    }
    map.on("moveend", scheduleSave);
    map.on("zoomend", scheduleSave);
    map.on("rotateend", scheduleSave);
    map.on("pitchend", scheduleSave);

    // Single shared popup
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 8,
      className: "zaahi-popup",
    });
    popupRef.current = popup;

    // Hover state for the communities layer
    let hoveredId: string | number | undefined;
    function setHover(id: string | number | undefined) {
      if (hoveredId === id) return;
      if (hoveredId !== undefined) {
        map.setFeatureState({ source: COMMUNITIES_SRC, id: hoveredId }, { hover: false });
      }
      hoveredId = id;
      if (id !== undefined) {
        map.setFeatureState({ source: COMMUNITIES_SRC, id }, { hover: true });
      }
    }

    map.on("load", async () => {
      // Signal to the Buildings hook that the style is ready so it can
      // safely addLayer/addSource. Purely additive — doesn't affect any
      // existing load-time code path below.
      setMapStyleReady(true);

      // ── Boundary-popup priority gate (founder spec 2026-05-31, Phase 1
      // hover dedup completion). The native maplibre `popup` instance
      // (used by master-plan / community / DDA-project / DDA-free-zone
      // / AD muni-dist-comm / amenity-point hovers) was being re-added
      // after the JSX zaahi/vault/dda popups had cleared it, because
      // when the user toggles a boundary layer ON via the Layers panel
      // its mousemove handler registers AFTER the ZAAHI handlers and
      // fires later in the dispatch order. Result on the live map:
      // ZAAHI listing card + "Sama Al Jadaf · COMMERCIAL-HOSPITALITY"
      // master-plan native popup stacked. This helper lets every
      // boundary handler defer to ZAAHI listings + shared-vault when
      // the cursor is already over either of them.
      const cursorOverZaahiOrVault = (
        e: MapMouseEvent & { features?: GeoJSON.Feature[] },
      ): boolean => {
        const blockingLayers = [ZAAHI_PLOTS_FILL, VAULT_SHARED_3D].filter(
          (lid) => map.getLayer(lid),
        );
        if (blockingLayers.length === 0) return false;
        return (
          map.queryRenderedFeatures(e.point, { layers: blockingLayers }).length > 0
        );
      };

      // ── Hover handlers stashed on a ref so loadLayer can attach them
      // to freshly-loaded layers (since loadLayer fires on demand and
      // doesn't have direct closure access to the popup).
      const ddaPlotHover = () => {
        map.getCanvas().style.cursor = "pointer";
      };
      const masterPlanLeave = () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      };
      const masterPlanHover = (planLabel: string) =>
        (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f) return;
          // Defer to ZAAHI listings / vault if either is at the cursor —
          // the boundary name popup would stack over the listing card.
          if (cursorOverZaahiOrVault(e)) {
            popup.remove();
            return;
          }
          map.getCanvas().style.cursor = "pointer";
          const layerRaw = (f.properties?.Layer as string) ?? planLabel;
          const clean = layerRaw.replace(/^PDF\s+_MP_LU_/, "").replace(/_/g, " ");
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div><div style="font-family:Georgia,serif;font-weight:700;font-size:10px;color:#C8A96E">${clean}</div>
               <div style="font-size:8px;opacity:0.7;margin-top:1px">${planLabel}</div></div>`,
            )
            .addTo(map);
        };

      // Generic amenity-point hover/click. Builds a small card with
      // header (layer label) + bold first field as title + remaining
      // fields as label/value rows. Click drops a pinned popup with a
      // close button; hover uses the shared closeButton=false popup.
      const renderPointCard = (label: string, fields: string[], props: Record<string, unknown>) => {
        const titleField = fields[0];
        const titleValue = String(props[titleField] ?? "—");
        const rows = fields
          .slice(1)
          .filter((k) => props[k] != null && String(props[k]).trim() !== "")
          .map(
            (k) =>
              `<div style="display:flex;justify-content:space-between;gap:8px;font-size:10px;line-height:1.3;margin-top:2px">
                 <span style="opacity:0.6;text-transform:capitalize">${k.replace(/_/g, " ")}</span>
                 <span style="color:#1A1A2E;font-weight:500;text-align:right;max-width:180px">${String(props[k])}</span>
               </div>`,
          )
          .join("");
        return `
          <div style="min-width:200px;max-width:280px">
            <div style="font-size:8px;letter-spacing:0.08em;text-transform:uppercase;color:#C8A96E;opacity:0.85">${label}</div>
            <div style="font-family:Georgia,serif;font-weight:700;font-size:13px;color:#1A1A2E;margin-top:2px;line-height:1.2">${titleValue}</div>
            ${rows}
          </div>`;
      };
      const pointHover = (label: string, fields: string[]) =>
        (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f) return;
          // Defer to ZAAHI / vault — amenity point cards must not stack
          // over a listing card at the same screen position.
          if (cursorOverZaahiOrVault(e)) {
            popup.remove();
            return;
          }
          map.getCanvas().style.cursor = "pointer";
          popup
            .setLngLat(e.lngLat)
            .setHTML(renderPointCard(label, fields, (f.properties ?? {}) as Record<string, unknown>))
            .addTo(map);
        };
      const pointLeave = () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      };
      // Click uses a separate pinned popup so the user can read the
      // address / connector list without holding cursor steady. Tracked
      // on a closure-scoped ref so re-clicking another point swaps it.
      let pinnedPopup: maplibregl.Popup | null = null;
      const pointClick = (label: string, fields: string[]) =>
        (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f || !f.geometry || f.geometry.type !== "Point") return;
          if (pinnedPopup) pinnedPopup.remove();
          pinnedPopup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            offset: 10,
            className: "zaahi-popup",
          })
            .setLngLat(f.geometry.coordinates as [number, number])
            .setHTML(renderPointCard(label, fields, (f.properties ?? {}) as Record<string, unknown>))
            .addTo(map);
        };

      hoverHandlersRef.current = {
        ddaPlotHover, masterPlanLeave, masterPlanHover,
        pointHover, pointLeave, pointClick,
      };

      await loadAmenityIcons(map);
      await attachOverlays(map);

      // ── ZAAHI Plots — real listings from /api/parcels/map.
      // Always loaded; this is the platform's primary content. Builds
      // both the polygon source (fill / line / glow) and the building
      // source (3D extrusions colored by land use).
      await loadZaahiPlots(map);

      // ── Private Plot Vault shared overlay ──
      // Owner-side vault entries flow through loadZaahiPlots (Phase 3
      // 2026-05-30). Only the shared-to-me path keeps its own loader.
      // 401-tolerant for signed-out users.
      void loadVaultShared(map);

      // ── Vault side-panel click handler — shared layer only. ──
      // Owner-side click routes from the ZAAHI_PLOTS_FILL handler below
      // via the `isVault` branch (Phase 3 unification).
      bindLayerEvent(map, "click", VAULT_SHARED_3D, (e: unknown) => {
        const ev = e as MapMouseEvent & { features?: GeoJSON.Feature[] };
        const f = ev.features?.[0];
        const id = f?.properties?.id as string | undefined;
        if (id) openVaultPanel({ id, mode: "share" });
      });
      // Hover popup parity with ZAAHI listings (founder spec 2026-05-30).
      // Mirrors the ZAAHI mousemove handler at ZAAHI_PLOTS_FILL: card
      // shows projectName / plotNumber, plot area, max GFA, FAR, max
      // height, plan date + asking price (vault) instead of total price.
      const vaultMove = (mode: "owner" | "share") =>
        (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f) return;
          // Priority: ZAAHI listings outrank the shared-vault popup.
          // If the cursor is also on a ZAAHI plot, defer to that handler.
          if (map.getLayer(ZAAHI_PLOTS_FILL)) {
            const upper = map.queryRenderedFeatures(e.point, {
              layers: [ZAAHI_PLOTS_FILL],
            });
            if (upper.length > 0) {
              setVaultHover(null);
              return;
            }
          }
          if (hoverCloseTimerRef.current != null) {
            window.clearTimeout(hoverCloseTimerRef.current);
            hoverCloseTimerRef.current = null;
          }
          map.getCanvas().style.cursor = "pointer";
          // Symmetric hover dedup — see PMTiles handler for the race
          // explanation. Vault clears ZAAHI for the same reason: an
          // adjacent ZAAHI listing's close timer may have been killed
          // by the shared hoverCloseTimerRef just above.
          setZaahiHover(null);
          const p = f.properties as Record<string, unknown>;
          const id = typeof p.id === "string" ? p.id : "";
          const fils = typeof p.askingPriceFils === "string" ? p.askingPriceFils : null;
          const askingAed = fils ? Math.floor(Number(fils) / 100) : null;
          setVaultHover({
            x: e.point.x,
            y: e.point.y,
            id,
            plotNumber: typeof p.plotNumber === "string" ? p.plotNumber : "",
            district: typeof p.district === "string" ? p.district : "",
            landUse: typeof p.landUse === "string" ? p.landUse : "",
            projectName: typeof p.projectName === "string" ? p.projectName : "",
            askingAed,
            area: typeof p.area === "number" ? p.area : 0,
            plotAreaSqft: typeof p.plotAreaSqft === "number" ? p.plotAreaSqft : 0,
            maxGfaSqft: typeof p.maxGfaSqft === "number" ? p.maxGfaSqft : 0,
            maxFloors: typeof p.maxFloors === "number" ? p.maxFloors : 0,
            maxHeightMeters: typeof p.maxHeightMeters === "number" ? p.maxHeightMeters : 0,
            maxHeightCode: typeof p.maxHeightCode === "string" ? p.maxHeightCode : "",
            far: typeof p.far === "number" ? p.far : 0,
            planDateIso: typeof p.planDateIso === "string" ? p.planDateIso : "",
            mode,
          });
          // Shared-vault popup wins over PMTiles for the same cursor frame.
          setDdaLandHover(null);
          // Kill the shared boundary native popup too (see ZAAHI handler).
          popupRef.current?.remove();
        };
      const vaultLeave = () => {
        map.getCanvas().style.cursor = "";
        if (hoverCloseTimerRef.current != null) {
          window.clearTimeout(hoverCloseTimerRef.current);
        }
        hoverCloseTimerRef.current = window.setTimeout(() => {
          setVaultHover(null);
          hoverCloseTimerRef.current = null;
        }, 220);
      };
      // Owner-side hover flows through the ZAAHI_PLOTS_FILL mousemove
      // handler (Phase 3 unification). Shared layer keeps its own.
      bindLayerEvent(map, "mousemove", VAULT_SHARED_3D, vaultMove("share") as (e: unknown) => void);
      bindLayerEvent(map, "mouseleave", VAULT_SHARED_3D, vaultLeave as (e: unknown) => void);

      // ── PMTiles land layers (DDA 99K + AD 362K + Oman 95K plots) ──
      addLandTileSource(map, DDA_LAND_TILES_SRC, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, "/tiles/dda-land.pmtiles");
      addLandTileSource(map, AD_ADM_TILES_SRC, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, "/tiles/ad-land-adm.pmtiles");
      addLandTileSource(map, AD_OTHER_TILES_SRC, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, "/tiles/ad-land-other.pmtiles");
      // Cold-load site must write the user's state too: addLandTileSource
      // creates the layers hidden (as at the basemap-swap / WebGL-restore
      // sites), and the [mapStyleReady] effect has already run by now.
      setLandTileVisibility(map, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, layersRef.current.ddaLandPlots);
      setLandTileVisibility(map, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, layersRef.current.adLandPlots);
      setLandTileVisibility(map, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, layersRef.current.adLandPlots);
      // Oman PMTiles dropped 2026-05-24.

      // City-ambient white-noise → bandpass swap on zoom > 16 was removed
      // 2026-06-10 (founder backlog #32): the bandpass sound rendered as
      // industrial shum on top of music, not as the intended "city" cue.
      // Music playlist stays running uninterrupted across all zoom levels.
      // sound.setCityAmbient / startCity / stopCity remain in src/lib/sound.ts
      // as dormant implementation — no remaining callers; safe to retire in
      // a separate cleanup PR if founder confirms the channel is dead.

      // ── ZAAHI Plots hover + click ──
      // No `map.getLayer(ZAAHI_PLOTS_FILL)` guard here — audit 1.17.
      // attachOverlays() always runs BEFORE loadZaahiPlots() creates that
      // layer (init :4568→:4574, basemap swap :5147→:5151), so the guard
      // was always false and these three handlers never bound: the cursor
      // stayed `grab` and clicking a plot did nothing, silently.
      // Binding ahead of the layer is safe — MapLibre 5 delegated
      // listeners re-resolve layer ids at dispatch time
      // (`_createDelegatedListener` filters on `this.getLayer(id)` per
      // event), so these start firing the moment loadZaahiPlots adds the
      // layer, and keep working across a style swap. Same unguarded
      // pattern as the VAULT_SHARED_3D click bind above, which works.
      bindLayerEvent(map, "mousemove", ZAAHI_PLOTS_FILL, (e0: unknown) => {
        const e = e0 as MapMouseEvent & { features?: GeoJSON.Feature[] };
        const f = e.features?.[0];
        if (!f) return;
        // Cancel any scheduled close — we're back on a polygon.
        if (hoverCloseTimerRef.current != null) {
          window.clearTimeout(hoverCloseTimerRef.current);
          hoverCloseTimerRef.current = null;
        }
        map.getCanvas().style.cursor = "pointer";
        const p = f.properties as {
          id?: string;
          plotNumber: string;
          district: string;
          emirate: string;
          area: number;
          priceAed: number | null;
          landUse: string;
          projectName?: string;
          plotAreaSqm?: number;
          plotAreaSqft?: number;
          maxGfaSqm?: number;
          maxGfaSqft?: number;
          maxFloors?: number;
          maxHeightMeters?: number;
          maxHeightCode?: string;
          far?: number;
          planDateIso?: string;
        };
        // Polygon centroid (mean of outer-ring vertices). Used for the
        // click-flyTo destination — falls back to the cursor lngLat
        // when the geometry isn't a Polygon (vector-tile fragmentation
        // can yield MultiPolygon at parcel boundaries).
        let cLng = e.lngLat.lng, cLat = e.lngLat.lat;
        const g = f.geometry;
        if (g && g.type === "Polygon" && g.coordinates[0]?.length > 0) {
          const ring = g.coordinates[0];
          cLng = ring.reduce((s, q) => s + q[0], 0) / ring.length;
          cLat = ring.reduce((s, q) => s + q[1], 0) / ring.length;
        }
        setZaahiHover({
          x: e.point.x,
          y: e.point.y,
          id: p.id ?? "",
          lng: cLng,
          lat: cLat,
          plotNumber: p.plotNumber,
          district: p.district,
          emirate: p.emirate ?? "",
          area: p.area,
          priceAed: p.priceAed,
          landUse: p.landUse,
          projectName: p.projectName ?? "",
          plotAreaSqm: p.plotAreaSqm ?? 0,
          plotAreaSqft: p.plotAreaSqft ?? 0,
          maxGfaSqm: p.maxGfaSqm ?? 0,
          maxGfaSqft: p.maxGfaSqft ?? 0,
          maxFloors: p.maxFloors ?? 0,
          maxHeightMeters: p.maxHeightMeters ?? 0,
          maxHeightCode: p.maxHeightCode ?? "",
          far: p.far ?? 0,
          planDateIso: p.planDateIso ?? "",
        });
        // ZAAHI listings take priority — drop any PMTiles / shared-vault
        // popup that fired for the same cursor frame so only one card
        // shows. Avoids stacked "Business Bay" + "3460730 Open Space".
        setDdaLandHover(null);
        setVaultHover(null);
        // Also kill the shared maplibre Popup if a boundary FILL layer
        // (DDA Projects / Communities / AD muni-dist-comm / FZ) had
        // attached its name-label popup at the same cursor point. The
        // detailed JSX card always wins over the one-line boundary tag.
        popupRef.current?.remove();
      });
      bindLayerEvent(map, "mouseleave", ZAAHI_PLOTS_FILL, () => {
        map.getCanvas().style.cursor = "";
        // Defer close ~220 ms so the cursor can transit onto the now
        // clickable card without it vanishing. Card's onMouseEnter
        // cancels the timer; onMouseLeave closes immediately.
        if (hoverCloseTimerRef.current != null) {
          window.clearTimeout(hoverCloseTimerRef.current);
        }
        hoverCloseTimerRef.current = window.setTimeout(() => {
          setZaahiHover(null);
          hoverCloseTimerRef.current = null;
        }, 220);
      });
      bindLayerEvent(map, "click", ZAAHI_PLOTS_FILL, (e0: unknown) => {
        const e = e0 as MapMouseEvent & { features?: GeoJSON.Feature[] };
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as {
          id?: string;
          isVault?: boolean;
          vaultEntryId?: string | null;
        };
        if (!props.id) return;
        // Founder spec 2026-04-12: a single combined cyberpunk
        // click effect (sweep + noise burst) — sound.click() now
        // emits both layers itself, so we no longer chain swooshOpen.
        sound.click();
        // Phase 3 unification (2026-05-30): vault rows ride the same
        // layer as public listings; the click handler routes to
        // VaultSidePanelAdapter via the isVault flag so the broker
        // pipeline / asking price / owner contact panel renders
        // instead of the public SidePanel.
        if (props.isVault === true && props.vaultEntryId) {
          openVaultPanel({ id: props.vaultEntryId, mode: "owner" });
          return;
        }
        openParcelPanel(props.id);
      });

      // ── Communities hover ──
      bindLayerEvent(map, "mousemove", COMMUNITIES_FILL, (e0: unknown) => {
        const e = e0 as MapMouseEvent & { features?: GeoJSON.Feature[] };
        const f = e.features?.[0];
        if (!f) return;
        if (cursorOverZaahiOrVault(e)) {
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        setHover((f.id as string | number | undefined) ?? f.properties?.COMM_NUM);
        const name = (f.properties?.CNAME_E as string) ?? "—";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">${name}</div>`,
          )
          .addTo(map);
      });
      bindLayerEvent(map, "mouseleave", COMMUNITIES_FILL, () => {
        map.getCanvas().style.cursor = "";
        setHover(undefined);
        popup.remove();
      });

      // ── AD Municipalities hover ──
      bindLayerEvent(map, "mousemove", AD_MUN_FILL, (e0: unknown) => {
        const e = e0 as MapMouseEvent & { features?: GeoJSON.Feature[] };
        const f = e.features?.[0];
        if (!f) return;
        if (cursorOverZaahiOrVault(e)) {
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const name = (f.properties?.NAMEENGLISH as string) ?? "—";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">${name}</div>`,
          )
          .addTo(map);
      });
      bindLayerEvent(map, "mouseleave", AD_MUN_FILL, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // ── AD Districts hover ──
      bindLayerEvent(map, "mousemove", AD_DIST_FILL, (e0: unknown) => {
        const e = e0 as MapMouseEvent & { features?: GeoJSON.Feature[] };
        const f = e.features?.[0];
        if (!f) return;
        if (cursorOverZaahiOrVault(e)) {
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const name = (f.properties?.NAMEENGLISH as string) ?? "—";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">${name}</div>`,
          )
          .addTo(map);
      });
      bindLayerEvent(map, "mouseleave", AD_DIST_FILL, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // ── AD Communities hover ──
      bindLayerEvent(map, "mousemove", AD_COMM_FILL, (e0: unknown) => {
        const e = e0 as MapMouseEvent & { features?: GeoJSON.Feature[] };
        const f = e.features?.[0];
        if (!f) return;
        if (cursorOverZaahiOrVault(e)) {
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const name = (f.properties?.COMMUNITYNAMEENG as string) ?? "—";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">${name}</div>`,
          )
          .addTo(map);
      });
      bindLayerEvent(map, "mouseleave", AD_COMM_FILL, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // Saudi Governorates + Riyadh Zones hover handlers removed
      // 2026-05-24 along with the rest of the Saudi coverage.

      // ── DDA Project Boundaries hover ──
      bindLayerEvent(map, "mousemove", DDA_PROJ_FILL, (e0: unknown) => {
        const e = e0 as MapMouseEvent & { features?: GeoJSON.Feature[] };
        const f = e.features?.[0];
        if (!f) return;
        if (cursorOverZaahiOrVault(e)) {
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const name = (f.properties?.ProjectName as string) ?? "—";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">${name}</div>`,
          )
          .addTo(map);
      });
      bindLayerEvent(map, "mouseleave", DDA_PROJ_FILL, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // ── DDA Free Zones hover ──
      bindLayerEvent(map, "mousemove", DDA_FZ_FILL, (e0: unknown) => {
        const e = e0 as MapMouseEvent & { features?: GeoJSON.Feature[] };
        const f = e.features?.[0];
        if (!f) return;
        if (cursorOverZaahiOrVault(e)) {
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const name = (f.properties?.ProjectName as string) ?? "—";
        const fz = f.properties?.IsFreeZone ? " (Free Zone)" : "";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">${name}${fz}</div>`,
          )
          .addTo(map);
      });
      bindLayerEvent(map, "mouseleave", DDA_FZ_FILL, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // ── Master plan hover (shared handler for islands + meydan) ──
// Hover handlers — the LAYER_REGISTRY loader registers per-layer
      // mouse listeners on demand when each layer is first loaded.
      // (See loadLayer in the helpers above.)
      setOverlaysReady(true);
    });

    mapRef.current = map;
    // E2E test handle. Read-only reference so Playwright can inspect the
    // live style registry (tests/e2e/layer-visibility.spec.ts). MapLibre
    // exposes no container→Map back-pointer, and the alternative (asserting
    // on canvas pixels) would depend on the remote glyph CDN. No behaviour
    // change; nothing in the app reads this.
    (window as unknown as { __zaahiMap?: MLMap }).__zaahiMap = map;

    // ── WebGL context loss / restore (perf-2026-08-21 item 5) ──────
    // There was no handling at all: a lost context left MapLibre's canvas
    // permanently blank underneath fully interactive chrome, recoverable
    // only by reloading the page. That presents as a hang, and it is the
    // most likely explanation for the "WebGL context was lost" report.
    //
    // preventDefault() on webglcontextlost is what makes restoration
    // possible — without it the browser never fires webglcontextrestored.
    // The context is genuinely gone at this point, so every GPU-backed
    // resource (style, sources, layers, deck.gl overlay) has to be rebuilt
    // on the way back; setStyle does that for the MapLibre side and the
    // deck.gl MapboxOverlay re-adds its interleaved layers off its own
    // styledata subscription.
    const canvas = map.getCanvas();
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      // Rebuild the style the user is currently on, not the mount-time one
      // — this effect has [] deps, hence baseMapRef.
      try {
        map.setStyle(STYLES[baseMapRef.current]);
        map.once("styledata", async () => {
          const ls = layersRef.current;
          addLandTileSource(map, DDA_LAND_TILES_SRC, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, "/tiles/dda-land.pmtiles");
          addLandTileSource(map, AD_ADM_TILES_SRC, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, "/tiles/ad-land-adm.pmtiles");
          addLandTileSource(map, AD_OTHER_TILES_SRC, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, "/tiles/ad-land-other.pmtiles");
          setLandTileVisibility(map, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, ls.ddaLandPlots);
          setLandTileVisibility(map, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, ls.adLandPlots);
          setLandTileVisibility(map, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, ls.adLandPlots);
          await loadAmenityIcons(map);
          await attachOverlays(map, { reattach: true });
          await loadZaahiPlots(map);
          void loadVaultShared(map);
          setContextLost(false);
        });
      } catch (err) {
        // Leave the overlay up — a failed rebuild is exactly the case where
        // the user needs to be told to reload rather than shown a dead map.
        console.error("[webgl] context restore failed:", err);
      }
    };
    // Capture phase, so this runs BEFORE MapLibre's own handler. preventDefault()
    // is what permits the browser to fire webglcontextrestored at all, and if
    // MapLibre handles the event first the opportunity can be missed. The
    // reporter's Firefox session logged "WebGL context was lost" with no visible
    // failure state, which is consistent with the notice never being reached.
    canvas.addEventListener("webglcontextlost", onContextLost, { capture: true });
    canvas.addEventListener("webglcontextrestored", onContextRestored, { capture: true });

    // Belt and braces: if the context was already gone before the listener was
    // attached (a race we cannot observe from here, and the most likely reading
    // of a lost context that surfaced no notice), catch it on the next frame.
    requestAnimationFrame(() => {
      try {
        const gl =
          (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ??
          (canvas.getContext("webgl") as WebGLRenderingContext | null);
        if (gl && gl.isContextLost()) {
          console.error("[webgl] context was already lost when the handler attached");
          setContextLost(true);
        }
      } catch { /* getContext can throw on a dead canvas — nothing to do */ }
    });

    // ── Post-paint re-measure (issue #10, defensive) ──────────────────────
    // NOTE ON SCOPE, so nobody mistakes this for the reported fix: MapLibre
    // 5.22 already ships its own ResizeObserver and trackResize defaults to
    // true, so a container that CHANGES size is handled without us. I could not
    // reproduce the reported "canvas never re-fits" defect in a browser, and a
    // second ResizeObserver here would duplicate MapLibre's.
    //
    // The one gap that observer cannot close is structural: it fires on change,
    // and this container is `position:absolute; inset:0`, so if the map measured
    // wrong at construction the container's box never changes and no callback
    // ever runs. A single resize once layout has settled closes exactly that,
    // costs one frame, and is a no-op when the measurement was already right.
    const settleRaf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          const c = map.getContainer();
          const b = map.getCanvas();
          if (Math.abs(c.clientHeight - b.clientHeight) > 1 || Math.abs(c.clientWidth - b.clientWidth) > 1) {
            debugLog(`[map] post-paint re-measure ${b.clientWidth}x${b.clientHeight} -> ${c.clientWidth}x${c.clientHeight}`);
            map.resize();
          }
        } catch { /* map may already be gone */ }
      });
    });

    // ── deck.gl hero GLBs ──────────────────────────────────────────
    // MapboxOverlay in `interleaved: true` mode shares MapLibre's
    // WebGL context. Each ScenegraphLayer loads a hero GLB from
    // /glb/buildings/ and renders one instance at the founder-locked
    // HERO_COORDS_*. Overlay attached in a separate [mapStyleReady]
    // useEffect below; cleanup removes it so HMR doesn't accumulate
    // WebGL contexts.

    // Auto-rotate controller — install once, drive enable/disable from
    // `autoRotateEnabled` state. HYBRID first-visit default: if no
    // localStorage key exists yet, treat as first-ever visit → start ON.
    // Subsequent visits use the saved value.
    const autoRotateCtrl = installAutoRotate(map);
    autoRotateCtrlRef.current = autoRotateCtrl;
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("zaahi-autorotate");
        if (saved === null || saved === "1") {
          setAutoRotateEnabled(true);
        }
      }
    } catch {
      /* localStorage may be blocked — stay OFF */
    }

    // Keyboard nav — WASD/QE/Space-C/RF/Shift running alongside the
    // normal mouse handlers. No modes, no UI toggle. Always-on.
    // Replaces the drone-mode controller deleted 2026-06-11
    // (postmortem: docs/research/drone-fps-postmortem-2026-06-11.md).
    const kbdNavCtrl = installKeyboardNav(map);
    kbdNavCtrlRef.current = kbdNavCtrl;

    return () => {
      autoRotateCtrl.destroy();
      autoRotateCtrlRef.current = null;
      kbdNavCtrl.destroy();
      kbdNavCtrlRef.current = null;
      // Detach deck.gl overlay before MapLibre.remove() so its WebGL
      // resources release cleanly. Best-effort — ignore if MapLibre
      // already torn down the map.
      try {
        if (deckOverlayRef.current) {
          map.removeControl(deckOverlayRef.current as unknown as maplibregl.IControl);
          deckOverlayRef.current = null;
        }
      } catch { /* map already gone, nothing to detach */ }
      cancelAnimationFrame(settleRaf);
      canvas.removeEventListener("webglcontextlost", onContextLost, { capture: true });
      canvas.removeEventListener("webglcontextrestored", onContextRestored, { capture: true });
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── deck.gl overlay init — deferred. Fires once mapStyleReady
  // flips true. Map-init useEffect has [] deps so it can't see
  // mapStyleReady update; this deferred effect is the only path
  // that actually attaches the overlay.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapStyleReady) return;
    if (deckOverlayRef.current) return;     // already attached
    try {
      const lightingEffect = new LightingEffect({
        ambient: new AmbientLight({ color: [255, 255, 255], intensity: 3.0 }),
        dir: new DirectionalLight({
          color: [255, 245, 230],
          intensity: 4.0,
          direction: [-1, -3, -1],
        }),
        dir2: new DirectionalLight({
          color: [220, 230, 255],
          intensity: 2.5,
          direction: [1, 3, 1],
        }),
      });
      const overlay = new MapboxOverlay({
        interleaved: true,
        effects: [lightingEffect],
        layers: [],
      });
      map.addControl(overlay as unknown as maplibregl.IControl);
      deckOverlayRef.current = overlay;
      setOverlayReady(true);
      debugLog("[GLB] MapboxOverlay attached (deferred init)");
    } catch (e) {
      console.error("[deckgl-spike] overlay init failed:", e);
    }
  }, [mapStyleReady]);

  // ── Lazy gate — hero GLBs render only at zoom ≥ 14, matching the
  // PMTiles 3D + ZAAHI Signature 3D threshold so the visibility band is
  // consistent across all 3D layers. At zoom < 14 the ScenegraphLayers
  // are cleared (no GLB fetch / GPU upload), so the city-wide view is
  // unaffected by the multi-MB asset.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ZOOM_GATE = 14;
    const update = () => {
      const active = map.getZoom() >= ZOOM_GATE;
      setGlbActive((prev) => (prev === active ? prev : active));
    };
    update();
    map.on("zoomend", update);
    return () => {
      map.off("zoomend", update);
    };
  }, [mapStyleReady]);

  // Sync deck.gl ScenegraphLayer entries from heroBuildingsRegistry.
  // Lazy-gated by glbActive (zoom ≥ 14) — when false, layers cleared
  // (no GLB fetch / GPU upload). In dev mode (?dev=1) each layer is
  // pickable, and clicking a hero opens HeroBuildingsDevPanel for it.
  useEffect(() => {
    const overlay = deckOverlayRef.current;
    if (!overlay) return;
    if (!glbActive) {
      overlay.setProps({ layers: [] });
      return;
    }
    overlay.setProps({
      layers: HERO_BUILDINGS.map((b) => {
        const eff = effectiveValues(b, heroOverrides[b.id]);
        return new ScenegraphLayer({
          id: `hero-${b.id}`,
          data: [{ position: eff.coords }],
          scenegraph: b.glb,
          getPosition: (d: { position: [number, number, number] }) => d.position,
          getOrientation: eff.orientation as unknown as [number, number, number],
          sizeScale: eff.size,
          _lighting: "pbr",
          pickable: devModeHero,
          onClick: devModeHero ? () => setEditingHeroId(b.id) : undefined,
          onError: (err: unknown) => console.error(`[GLB ${b.id}] error:`, err),
        });
      }),
    });
  }, [glbActive, overlayReady, heroOverrides, devModeHero]);



  // Drive the auto-rotate controller from React state. Persists choice,
  // gently tilts to 3D if the user is in flat view (rotation would
  // otherwise showcase nothing), and shows the first-ever hint toast
  // once per browser via a separate localStorage flag.
  useEffect(() => {
    const ctrl = autoRotateCtrlRef.current;
    if (!ctrl) return;
    if (autoRotateEnabled) {
      // Auto-tilt to 3D if currently flat — easeTo runs concurrently with
      // ctrl.enable() because the controller skips ticks while
      // map.isEasing() is true (see auto-rotate.ts shouldRotate gate).
      const m = mapRef.current;
      if (m && m.getPitch() < 30) {
        m.easeTo({ pitch: 45, duration: 600 });
      }
      ctrl.enable();
      try { localStorage.setItem("zaahi-autorotate", "1"); } catch { /* ignore */ }
      // First-ever hint toast — tracked in a separate flag so it doesn't
      // fire on every subsequent enable.
      let hintShown = false;
      try { hintShown = localStorage.getItem("zaahi-autorotate-hint-shown") === "1"; } catch { /* ignore */ }
      if (!hintShown) {
        setShowAutoRotateHint(true);
        try { localStorage.setItem("zaahi-autorotate-hint-shown", "1"); } catch { /* ignore */ }
        const t = window.setTimeout(() => setShowAutoRotateHint(false), 3500);
        return () => window.clearTimeout(t);
      }
      return;
    }
    ctrl.disable();
    setShowAutoRotateHint(false);
    try { localStorage.setItem("zaahi-autorotate", "0"); } catch { /* ignore */ }
  }, [autoRotateEnabled]);

  // Theme swap → reload basemap, reattach overlays after styledata fires,
  // and re-tint the road colour to match.
  //
  // FIRST-MOUNT GUARD (perf-2026-08-21 item 1). React runs passive effects in
  // hook-declaration order, and the map-init effect above assigns
  // `mapRef.current = map` synchronously in its own body. So on the very first
  // commit this effect already sees a non-null map and its `if (!map) return`
  // guard cannot fire — it called setStyle on the freshly constructed map
  // while that map's initial style was still loading. MapLibre has no
  // style-equality shortcut, so `_diffStyle` → `setState` → `_checkLoaded()`
  // threw "Style is not done loading.", which MapLibre caught and answered by
  // rebuilding the style from scratch. Every loader below then ran a second
  // time on top of the map-init pass: /api/parcels/map ×2, every enabled
  // /api/layers/* ×2, and the 197-parcel / 456-extrusion feature build and GPU
  // upload ×2, plus a blank canvas while the discarded style rebuilt.
  // `baseMap` only ever changes via swapBaseMap (a user click), so skipping
  // the mount run costs nothing and removes the whole duplicate pass.
  const baseMapInitRef = useRef(true);
  useEffect(() => {
    if (baseMapInitRef.current) {
      baseMapInitRef.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(STYLES[baseMap]);
    map.once("styledata", async () => {
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
      // map.keyboard intentionally stays disabled — see map init for
      // the keyboard:false rationale (Phase 2 feat/keyboard-nav).

      // ── PMTiles re-attach FIRST ──
      // Critical: if any await further down throws (amenity icons,
      // attachOverlays, or the /api/parcels/map fetch), the PMTiles
      // re-add must already have happened. Used to live after the
      // awaits and disappeared in dark/satellite mode whenever any
      // upstream loader hiccupped — founder fix 2026-05-23.
      addLandTileSource(map, DDA_LAND_TILES_SRC, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, "/tiles/dda-land.pmtiles");
      addLandTileSource(map, AD_ADM_TILES_SRC, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, "/tiles/ad-land-adm.pmtiles");
      addLandTileSource(map, AD_OTHER_TILES_SRC, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, "/tiles/ad-land-other.pmtiles");
      // Oman PMTiles dropped 2026-05-24.
      setLandTileVisibility(map, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, layers.ddaLandPlots);
      setLandTileVisibility(map, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, layers.adLandPlots);
      setLandTileVisibility(map, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, layers.adLandPlots);

      // ── Then everything else (any of these can throw safely now) ──
      await loadAmenityIcons(map);
      await attachOverlays(map, { reattach: true });
      // ZAAHI plots also need to be re-attached after a basemap swap
      // (maplibre's source registry was wiped). The loader is idempotent
      // on map.getSource so it's safe to call.
      await loadZaahiPlots(map);
      // Shared-with-me vault overlay also needs re-attachment after a
      // basemap swap. Owner-side vault rides loadZaahiPlots (Phase 3).
      void loadVaultShared(map);
      if (map.getLayer(ROADS_LINE)) {
        map.setPaintProperty(ROADS_LINE, "line-color", baseMap === "dark" ? "#888888" : "#666666");
      }
    });
  }, [baseMap]);

  // Layer toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !overlaysReady) return;
    const plotLabelsOn = layers.plotLabels;
    for (const def of LAYER_REGISTRY) {
      void setLayerVisibility(map, def, !!layers[def.key], plotLabelsOn);
    }
  }, [layers, overlaysReady]);

  // PMTiles land toggles — single toggle per source (DDA / AD)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !overlaysReady) return;
    setLandTileVisibility(map, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, layers.ddaLandPlots);
    setLandTileVisibility(map, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, layers.adLandPlots);
    setLandTileVisibility(map, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, layers.adLandPlots);
  }, [layers.ddaLandPlots, layers.adLandPlots, overlaysReady]);

  // District-name symbol layer visibility — direct toggle since this
  // layer lives outside LAYER_REGISTRY (custom centroid source, no
  // hover/click handlers, no per-feature fetch). The layer is added
  // via ensureDistrictNamesLayer inside attachOverlays.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer(DISTRICT_NAMES_LAYER)) {
      map.setLayoutProperty(
        DISTRICT_NAMES_LAYER,
        "visibility",
        layers.districtNames ? "visible" : "none",
      );
    }
  }, [layers.districtNames]);

  // ── Private Plot Vault — Shared-with-me toggle wiring. ──
  // Layer visibility flips O(1) — source is loaded on map-init and
  // stays alive for the page lifetime. Owner-side vault rendering is
  // unified with public listings (Phase 3 2026-05-30) and visibility
  // is no longer gated on a "My Vault" toggle. The conflict-marker layer
  // is NOT in that group: it is gated on vaultOnlyMode via layout
  // visibility in the next useEffect (its source carries only conflicting
  // vault plots, so a filter cannot do that gating for it).
  //
  // Vault-only mode override: when ON, the shared layer is
  // force-visible regardless of the user's per-layer toggle state.
  // ZAAHI/owner-side filtering for vault-only mode lives in the next
  // useEffect.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sharedV = (vaultOnlyMode || layers.vaultShared) ? "visible" : "none";
    if (map.getLayer(VAULT_SHARED_3D)) {
      map.setLayoutProperty(VAULT_SHARED_3D, "visibility", sharedV);
    }
  }, [layers.vaultShared, vaultOnlyMode]);

  // Vault-only mode side effect — direction flip + PMTiles exclusion
  // direction + conflict marker visibility + localStorage persistence.
  // Phase 2 archie client (2026-05-30) factored the filter logic into
  // reapplyMapFilters so Archie's filter_by_land_use /
  // filter_by_status tools compose with vault-mode direction.
  //
  // ⚠️ INVARIANT (founder spec 2026-05-31 v2):
  //   OFF (default): direction = isVault !== true  → public listings.
  //   ON  (lock):    direction = isVault === true  → caller's PPV.
  // buildZaahiFilter merges this with Archie filters (if any) into
  // a single ["all", …] expression.
  //
  // Conflict markers visibility flips with vaultOnlyMode so red dots
  // never render over a filtered-out vault polygon (root cause of the
  // v1 revert, commit 02e837f).
  //
  // PMTiles exclusion direction flips so the visual gap left by
  // filter-hidden ZAAHI listings is filled by the PMTiles background
  // (root cause of the v2 "white holes"). Vault plot numbers stay in
  // the exclusion set unconditionally — privacy invariant.
  //
  // PMTiles 3D opacity is intentionally NOT touched any more — the
  // pre-2026-05-31 0.45 → 0.1 dim made fond buildings unreadable; the
  // founder spec now keeps them at the addLandTileSource default 0.45
  // regardless of vault-only state.
  //
  // DDA districts / amenities / other contextual layers are
  // deliberately NOT touched — they stay user-controlled via the
  // Layers panel.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Sync ref immediately so reapplyMapFilters + the exclusion helper
    // read the current value (the mirror useEffect runs after this one).
    vaultOnlyModeRef.current = vaultOnlyMode;
    reapplyMapFilters();
    // Re-apply PMTiles exclusion so the listing plot numbers drop in
    // / out of the exclude set in lockstep with the direction flip.
    applyZaahiExclusionToTileLayers(map);
    // Conflict markers ride the same direction as the vault polygons.
    // OFF → vault filtered out → markers must hide. ON → markers visible.
    if (map.getLayer(VAULT_CONFLICT_MARKERS_LAYER)) {
      map.setLayoutProperty(
        VAULT_CONFLICT_MARKERS_LAYER,
        "visibility",
        vaultOnlyMode ? "visible" : "none",
      );
    }
    try {
      localStorage.setItem("zaahi-vault-only-mode", vaultOnlyMode ? "1" : "0");
    } catch { /* ignore quota / SSR */ }
  }, [vaultOnlyMode]);

  useEffect(() => {
    if (!layersOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (panelBtnRef.current?.contains(t)) return;
      setLayersOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [layersOpen]);

  // First time the user opens the layers panel, pick the country that
  // matches the current map center and expand only that one. After the
  // first open, user toggles stick — we never re-auto-expand.
  useEffect(() => {
    if (!layersOpen || countryInitialisedRef.current) return;
    const map = mapRef.current;
    if (!map) return;
    const ctr = map.getCenter();
    const detected = detectCountryFromLngLat(ctr.lng, ctr.lat);
    setCountryOpen({
      dubai: false, abudhabi: false, otheruae: false, amenities: false,
      [detected]: true,
    });
    countryInitialisedRef.current = true;
  }, [layersOpen]);

  useEffect(() => {
    if (!legendOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (legendRef.current?.contains(t)) return;
      // The Legend can be opened from multiple triggers (big-map right
      // stack + mini-dock right rail since the 5×5 redesign 2026-05-24).
      // Any trigger marked `data-legend-trigger` is treated as part of
      // the Legend surface so a click on it doesn't immediately
      // re-close the panel that the same click just opened.
      if (t.closest?.("[data-legend-trigger]")) return;
      setLegendOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [legendOpen]);


  const c = PALETTE[theme];
  const isDark = theme === "dark";

  const mapControls = useMapControls({
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
  });

  // ── Wave 3c proactive Archie (founder spec 2026-06-10) ──
  // Watches camera dwell, parcel-open count, and filter-empty state.
  // Surfaces a badge "1" + caption pill on the launcher when one of 3
  // triggers fires; all anti-spam logic (2/session cap, 60s cooldown,
  // 24h per-type dismiss memory, single active nudge) lives in the
  // hook. The page only forwards state and renders the nudge UI.
  const { nudge, acceptNudge, dismissNudge } = useProactiveArchie({
    mapRef,
    selectedParcelId,
    visibleCount,
    filterState,
  });

  return (
    <div
      data-map-page=""
      style={{
        // `fixed` instead of `absolute` so the map stays pinned to the
        // visual viewport on mobile — iOS Safari's URL bar show/hide and
        // any body overscroll bounce can no longer reflow this container.
        // overflow:hidden caps any accidental child scroll. Desktop renders
        // identically (the page already wasn't scrollable). The
        // `data-map-page` attribute scopes the overscroll-behavior /
        // touch-action rules in globals.css to this route only.
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: c.bg,
        color: c.text,
        fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />


      {/* Sun-time override slider — visible only when the ☀ button in
          the right stack is toggled on. Drives the directional-light
          date that useSunLight feeds to map.setLight(). Double-click
          on the slider also resets to real time (in addition to the
          dedicated button). */}
      {sunSliderActive && <SunTimeSlider onChange={setSunTimeOverride} />}

      {showAutoRotateHint && <AutoRotateHint />}

      {/* Header */}
      <HeaderBar
        c={c}
        isDark={isDark}
        onFindInTiles={findPlotInTiles}
        onFly={(lng, lat) =>
          mapRef.current?.flyTo({
            center: [lng, lat],
            zoom: 16,
            pitch: 45,
            duration: 2000,
            // essential: true — without it MapLibre skips the animation
            // entirely under prefers-reduced-motion, so Find plot appeared
            // to do nothing. Every other flyTo in this file already sets it.
            essential: true,
          })
        }
        onSelectParcel={(id) => openParcelPanel(id)}
        onOpenAddModal={() => setAddFlow("chooser")}
        vaultOnlyMode={vaultOnlyMode}
        onToggleVaultOnly={() => setVaultOnlyMode((v) => !v)}
        filterPanelOpen={filterPanelOpen}
        activeFilterCount={activeFilterCount}
        onToggleFilterPanel={() => setFilterPanelOpen((o) => !o)}
      />
      {addFlow === "chooser" && (
        <AddPlotChooser
          onPickListing={() => setAddFlow("listing")}
          onPickVault={() => setAddFlow("vault")}
          onClose={() => setAddFlow("none")}
        />
      )}
      {addFlow === "listing" && (
        <AddPlotModal
          // Per Option B: cancel/×/Esc/backdrop inside the listing flow
          // returns to the chooser, not to the bare map.
          onClose={() => setAddFlow("chooser")}
          onSubmitted={(id) => {
            // Submitted parcels start in PENDING_REVIEW and don't show on the
            // public map until verified — so we can't fly to them yet, just close.
            debugLog("[zaahi] submitted parcel", id);
            setAddFlow("none");
            setToast({
              kind: "success",
              message: "Listing submitted",
              sub: "It will appear on the map once verified by an admin.",
            });
          }}
        />
      )}
      {addFlow === "vault" && (
        <AddPlotWizardModal
          initialPlotNumber={addPlotPrefill ?? undefined}
          // Per Option B: cancel/×/Esc/backdrop inside the vault flow
          // returns to the chooser, not to the bare map.
          onCancel={() => {
            setAddFlow("chooser");
            setAddPlotPrefill(null);
          }}
          onCreated={(id, coords) => {
            debugLog("[zaahi] vault entry created", id, coords);
            setAddFlow("none");
            setAddPlotPrefill(null);
            // Phase 3 (2026-05-30): vault rows ride the unified ZAAHI
            // layer, so refreshing /api/parcels/map is enough — the
            // new VAULT_PRIVATE parcel will appear immediately. No
            // separate toggle to flip; the layer is always visible.
            const map = mapRef.current;
            if (map) {
              void loadZaahiPlots(map);
              if (coords.latitude != null && coords.longitude != null) {
                map.flyTo({
                  center: [coords.longitude, coords.latitude],
                  zoom: 17,
                  pitch: 45,
                  duration: 1500,
                  essential: true,
                });
              }
            }
            setToast({
              kind: "success",
              message: "Added to vault",
              sub: coords.latitude != null
                ? "Flying to your plot — it's a 3D building now."
                : "Your plot is now visible on the map.",
            });
          }}
          onExistingFound={(id) => {
            debugLog("[zaahi] vault entry already exists", id);
            setAddFlow("none");
            setAddPlotPrefill(null);
            setToast({
              kind: "success",
              message: "Already in vault",
              sub: "Opened your existing entry — go to /vault to edit.",
            });
          }}
          onError={(message) => {
            // Wizard keeps its inline error visible; the toast adds a
            // top-right notification so the user notices even if their
            // attention is elsewhere. Modal stays open — user can retry.
            setToast({
              kind: "error",
              message: "Add to vault failed",
              sub: message,
            });
          }}
        />
      )}
      {toast && <MapToast toast={toast} setToast={setToast} />}

      {/* Layers / Legend / basemap / auto-rotate triggers now live in
          the symmetric 5×5 big-map button stacks below (founder
          spec 2026-05-24). Layers retains `panelBtnRef` via the left
          stack so click-outside on the layers panel still works. */}

      {legendOpen && <LandUseLegend legendRef={legendRef} setLegendOpen={setLegendOpen} />}

      {/* Basemap selector lives on the left rail (slots 2-4). baseMap /
          setBaseMap state stays at the page level. The historical mini-
          dock that briefly hosted it was removed 2026-06-01. */}

      {/* Cursor coordinates — left bottom corner, mini */}
      <div
        style={{
          position: "absolute",
          left: 16,
          bottom: 8,
          fontSize: 11,
          color: c.textDim,
          fontFamily: '"SF Mono", "Menlo", monospace',
          letterSpacing: "0.04em",
          zIndex: 11,
          pointerEvents: "none",
        }}
      >
        <MapCoordsReadout mapRef={mapRef} /> · z<MapZoomReadout mapRef={mapRef} />
      </div>

      <MapLeftRail
        autoRotateEnabled={autoRotateEnabled}
        baseMap={baseMap}
        baseMapBusy={baseMapBusy}
        layersOpen={layersOpen}
        panelBtnRef={panelBtnRef}
        setAutoRotateEnabled={setAutoRotateEnabled}
        setLayersOpen={setLayersOpen}
        setPortalOpen={setPortalOpen}
        swapBaseMap={swapBaseMap}
      />

      <MapRightRail
        is3D={is3D}
        legendBtnRef={legendBtnRef}
        legendOpen={legendOpen}
        mapRef={mapRef}
        setIs3D={setIs3D}
        setLegendOpen={setLegendOpen}
        setSunSliderActive={setSunSliderActive}
        sunSliderActive={sunSliderActive}
      />

      {/* Wave 2: Filter Panel — right-anchored side panel. Mounts on
          top of the map (zIndex 12 above other rails). Single source
          of truth: filterState here, panel reads via state prop and
          writes via onChange (debounced). Archie writes via
          mapControls.filterByLandUse / filterByStatus which mutate the
          same filterState. The sync useEffect mirrors state → refs
          and calls reapplyMapFilters. */}
      <FilterPanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        state={filterState}
        onChange={(next) => setFilterState(next)}
        onReset={() => setFilterState(EMPTY_FILTER_STATE)}
        availableDistricts={mergedDistricts}
        visibleCount={visibleCount}
        totalListings={totalListings}
      />

      {layersOpen && (
      <Panel
        ref={panelRef}
        radius={RADIUS_PANEL}
        style={{
          position: "absolute",
          top: 64,
          left: 60,
          // Phase mobile-fix 2026-05-31: cap the panel at the viewport
          // width minus the 60 px left offset and a 20 px right gutter
          // so on a 360 px phone the panel shrinks to 280 px instead of
          // spilling 20 px off-screen. Desktop (>= 400 px viewport)
          // gets the historical 320 px because min() picks the smaller.
          width: "min(320px, calc(100vw - 80px))",
          maxHeight: "calc(100vh - 80px)",
          overflowY: "auto",
          zIndex: 11,
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            padding: "10px 14px",
            background: PANEL_BG,
            backdropFilter: PANEL_BLUR,
            WebkitBackdropFilter: PANEL_BLUR,
            // Sub-border on the sticky header is intentionally lighter
            // (0.08) than PANEL_BORDER — it's a divider inside the
            // panel, not the panel's own edge.
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: GOLD,
            fontWeight: 700,
          }}
        >
          <span>Layers</span>
          <button
            onClick={() => setLayersOpen(false)}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.55)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = GOLD; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)"; }}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.04)",
              transition: "border-color 150ms ease, background 150ms ease",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = GOLD; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.15)"; }}
          >
            <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.55)" }}>⌕</span>
            <input
              value={layerSearch}
              onChange={(e) => setLayerSearch(e.target.value)}
              placeholder="Search layers..."
              style={{
                flex: 1,
                border: 0,
                background: "transparent",
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 11,
                outline: "none",
                minWidth: 0,
                fontFamily: "inherit",
              }}
            />
            {layerSearch && (
              <button
                onClick={() => setLayerSearch("")}
                aria-label="Clear search"
                style={{ background: "transparent", border: 0, color: "rgba(255, 255, 255, 0.55)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* ZAAHI Listings — always loaded via loadZaahiPlots; the layer
            cannot be toggled off, so the static "Always on" row was
            removed from the panel on 2026-06-10 (founder backlog
            follow-up) to reduce clutter. The layer continues to render
            on the map unconditionally — the change is purely UI.
            Earlier dynamic-counter commit e1d14fb was also dropped
            during this cleanup since its only render site is now gone. */}

        {/* Land-Use Archetypes — per-land-use 3D building morphology on the
            ZAAHI listings (Three.js CustomLayer). Prod default-OFF; this row
            is the user-facing switch (Variant B) that was previously only
            reachable via ?archetypes=1. Backed by localStorage so the choice
            survives the auth/SSO redirect that strips the query. */}
        <div
          style={{
            padding: "8px 14px 2px",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: GOLD,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 700,
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          Listings 3D
        </div>
        <LayerToggle
          label="Land-Use Archetypes"
          description={`Per-land-use 3D building shapes on ZAAHI listings instead of the default stepped massing. Visible from zoom ${ARCHETYPE_MIN_ZOOM}.`}
          checked={archetypesOn}
          onChange={handleArchetypesToggle}
          color={GOLD}
        />

        {/* Buildings — digital-twin layer (completed + under-construction
            real towers). 2026-06-10: rows with count=0 hide entirely so
            the panel reflects only what data we actually have. New towers
            will surface a row automatically. The section title is also
            conditional on at least one non-empty bucket — empty section
            header is just noise. */}
        {(() => {
          const completedCount = loadedBuildings.filter((b) => b.status === "COMPLETED").length;
          const underConstructionCount = loadedBuildings.filter((b) => b.status === "UNDER_CONSTRUCTION").length;
          if (completedCount === 0 && underConstructionCount === 0) return null;
          return (
            <>
              <div
                style={{
                  padding: "8px 14px 2px",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: GOLD,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontWeight: 700,
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                Buildings
              </div>
              {completedCount > 0 && (
                <LayerToggle
                  label={`Completed · ${completedCount}`}
                  checked={completedVisible}
                  onChange={setCompletedVisible}
                  color="rgba(255, 255, 255, 0.9)"
                />
              )}
              {underConstructionCount > 0 && (
                <LayerToggle
                  label={`Under Construction · ${underConstructionCount}`}
                  checked={underConstructionVisible}
                  onChange={setUnderConstructionVisible}
                  color="rgba(255, 255, 255, 0.9)"
                />
              )}
            </>
          );
        })()}

        {/* Country → category → layer hierarchy (Phase 1 RBAC scaffold).
            Labels + lock tiers come from LAYER_META; counts/on summed
            per country. Inside each country, categories render as
            compact LayerGroup sub-sections (no per-category collapse —
            the country collapse is the primary control). */}
        {(() => {
          type PanelItem = { key: string; label: string; description?: string; requiredTier?: LayerLockTier; comingSoon?: boolean };
          const q = layerSearch.trim().toLowerCase();
          const searchActive = q.length > 0;
          // Human-readable label + description per layer. Description renders
          // as native tooltip on row hover. DDA district labels come from the
          // DDA_LAYERS table; explicit overrides below carry friendly names
          // for everything else (amenities, vault, master plans, etc.).
          const labels: Record<string, string> = {};
          for (const d of DDA_LAYERS) labels[d.key] = d.label;
          Object.assign(labels, {
            communities: "Communities of Dubai",
            roads: "Major roads of Dubai",
            metro: "Dubai Metro — lines and stations",
            plotLabels: "Plot numbers (visible when you zoom in)",
            districtNames: "District Names",
            ddaProjects: "DDA project boundaries (master plans)",
            ddaFreeZones: "Free economic zones in Dubai",
            ddaLandPlots: "Dubai Land Plots · 99K parcels from DDA registry",
            evChargers: "Electric Vehicle charging stations",
            metroStations: "Dubai Metro — station points",
            tramStations: "Dubai Tram — station points",
            marineStations: "Marine transport — abra / ferry stations",
            vaultShared: "Shared with me — vault entries others granted you access to",
            islands: "Dubai Islands master plan",
            meydan: "Meydan Horizon master plan",
            alFurjan: "Al Furjan master plan",
            intlCity23: "International City Phase 2 & 3 master plan",
            residential12: "Residential District I & II master plan",
            d11: "D11 — Parcel L/D master plan",
            nadAlHammer: "Nad Al Hammer master plan",
            adMunicipalities: "Abu Dhabi municipalities",
            adDistricts: "Abu Dhabi districts",
            adCommunities: "Abu Dhabi communities",
            adLandPlots: "Abu Dhabi Land Plots · 362K parcels from DMT registry",
            uaeDistricts: "UAE districts (Sharjah, Ajman, RAK, UAQ, Fujairah)",
            // Coming-soon emirate placeholders — English + Arabic
            emirateSharjah: "Sharjah · شارقة",
            emirateRAK: "Ras Al Khaimah · رأس الخيمة",
            emirateAjman: "Ajman · عجمان",
            emirateFujairah: "Fujairah · الفجيرة",
            emirateUAQ: "Umm Al Quwain · أم القيوين",
            // Coming-soon environmental data layers
            dubaiNoiseLevels: "Noise Levels · Dubai",
          });
          const descriptions: Record<string, string> = {
            communities: "Community / neighbourhood boundary polygons across Dubai.",
            roads: "Major roads of Dubai — highways, primary, and secondary arteries.",
            metro: "Full Dubai Metro line geometries with station markers.",
            plotLabels: "Per-plot numeric labels. Visible at zoom 16+ to avoid clutter.",
            districtNames: "Dubai community / district name labels (zoom 11+). On by default — navigation aid.",
            ddaProjects: "Boundaries of named projects/developments registered with DDA (Dubai Development Authority).",
            ddaFreeZones: "Designated Free Economic Zones in Dubai (DIFC, JAFZA, DMC, etc.).",
            ddaLandPlots: "All 99,000 land plots in DDA's public registry. Shows ownership, area, and land-use status.",
            evChargers: "Public electric vehicle charging stations in Dubai (DEWA + private operators).",
            metroStations: "Individual Dubai Metro station locations as point markers.",
            tramStations: "Dubai Tram station locations along the Marina line.",
            marineStations: "Marine transport stations — water buses, abras, ferry terminals.",
            vaultShared: "Vault entries that other ZAAHI users have shared specifically with you.",
            islands: "DDA master plan for Dubai Islands (Deira waterfront development). PMTiles overlay.",
            meydan: "DDA master plan for Meydan Horizon (south of Downtown). PMTiles overlay.",
            alFurjan: "DDA master plan for Al Furjan (south of JLT). PMTiles overlay.",
            intlCity23: "DDA master plan for International City Phases 2 and 3. PMTiles overlay.",
            residential12: "DDA master plan for Residential District I & II. PMTiles overlay.",
            d11: "DDA master plan for D11 — Parcel L/D (Mohammed Bin Rashid City). PMTiles overlay.",
            nadAlHammer: "DDA master plan for Nad Al Hammer (Ras Al Khor area). PMTiles overlay.",
            adMunicipalities: "Three top-level municipalities of Abu Dhabi emirate (City, Al Ain, Al Dhafra).",
            adDistricts: "Administrative districts within Abu Dhabi municipalities.",
            adCommunities: "Community-level neighbourhood polygons in Abu Dhabi.",
            adLandPlots: "All 362,000 land plots in Abu Dhabi from the DMT (Department of Municipalities and Transport) registry.",
            uaeDistricts: "District boundaries for the five northern emirates (Sharjah, Ajman, UAQ, RAK, Fujairah).",
            emirateSharjah: "Coming soon — Sharjah plots in development.",
            emirateRAK: "Coming soon — Ras Al Khaimah plots in development.",
            emirateAjman: "Coming soon — Ajman plots in development.",
            emirateFujairah: "Coming soon — Fujairah plots in development.",
            emirateUAQ: "Coming soon — Umm Al Quwain plots in development.",
            dubaiNoiseLevels: "Real-time noise monitoring via Dubai Municipality — coming soon.",
          };
          // DDA district layers — generic "Community-level boundary" tooltip
          // since each polygon is one of the 206 community sub-areas.
          for (const d of DDA_LAYERS) {
            if (!descriptions[d.key]) {
              descriptions[d.key] = `DDA community / sub-area: ${d.label}.`;
            }
          }
          const grouped: Record<LayerCountry, Partial<Record<LayerCategory, PanelItem[]>>> = {
            dubai: {}, abudhabi: {}, otheruae: {}, amenities: {},
          };
          for (const [key, meta] of Object.entries(LAYER_META)) {
            (grouped[meta.country][meta.category] ??= []).push({
              key,
              label: labels[key] ?? key,
              description: descriptions[key],
              requiredTier: meta.tier,
              comingSoon: meta.comingSoon,
            });
          }
          return LAYER_COUNTRY_ORDER.map((country) => {
            const cats = grouped[country];
            const allInCountry: PanelItem[] = Object.values(cats).flat().filter((x): x is PanelItem => !!x);
            const matches = searchActive
              ? allInCountry.filter((i) => i.label.toLowerCase().includes(q))
              : allInCountry;
            if (searchActive && matches.length === 0) return null;
            // Coming-soon rows aren't real toggles — exclude them from
            // the "on / total" count shown next to the country header.
            const countable = allInCountry.filter((i) => !i.comingSoon);
            const onCount = countable.filter((i) => layers[i.key as keyof LayersState] as boolean).length;
            const total = countable.length;
            const open = searchActive || !!countryOpen[country];
            return (
              <CountryGroup
                key={country}
                c={c}
                title={COUNTRY_LABELS[country]}
                open={open}
                searchActive={searchActive}
                onToggle={() => setCountryOpen((s) => ({ ...s, [country]: !s[country] }))}
                onCount={onCount}
                total={total}
              >
                {LAYER_CATEGORY_ORDER.map((cat) => {
                  const items = cats[cat];
                  if (!items || items.length === 0) return null;
                  // 2026-06-10 (founder backlog): "Shared with me" auto-
                  // hides when the caller has zero shared vault records.
                  // The toggle behind it (vaultShared) controls a layer
                  // that's pointless to render when no one shared anything,
                  // so the whole category drops off the panel. While the
                  // count is still loading (null), we keep the group up
                  // with a "(…)" badge so a slow fetch doesn't flash an
                  // empty slot in.
                  if (cat === "vault" && sharedVaultCount === 0) return null;
                  const ckey = `${country}:${cat}`;
                  // Founder spec 2026-05-29: each category folds
                  // independently. Search collapses the fold state and
                  // forces every group open so matches surface.
                  const catOpen = searchActive || !!categoryOpen[ckey];
                  const customBadge =
                    cat === "vault"
                      ? `(${sharedVaultCount ?? "…"})`
                      : undefined;
                  return (
                    <LayerGroup
                      key={`${country}-${cat}`}
                      c={c}
                      title={CATEGORY_LABELS[cat]}
                      open={catOpen}
                      onToggle={() => setCategoryOpen((s) => ({ ...s, [ckey]: !s[ckey] }))}
                      search={layerSearch}
                      items={items}
                      isOn={(k) => layers[k as keyof LayersState] as boolean}
                      onChange={(k, v) => setLayers((l) => ({ ...l, [k]: v }))}
                      customBadge={customBadge}
                    />
                  );
                })}
              </CountryGroup>
            );
          });
        })()}

        {/* DDA + AD Land toggles are in Base Layers above */}
      </Panel>
      )}

      <style jsx global>{`
        .maplibregl-canvas-container {
          filter: ${isDark ? "brightness(1.3) hue-rotate(210deg) saturate(0.7)" : "none"};
          transition: filter 0.3s ease;
        }
        .maplibregl-ctrl-top-right {
          margin-top: 60px !important;
          margin-right: 16px !important;
        }
        .maplibregl-ctrl-group {
          background: rgba(10, 22, 40, 0.4) !important;
          border: 1px solid rgba(200, 169, 110, 0.3) !important;
          box-shadow: none !important;
          border-radius: 6px !important;
          overflow: hidden;
        }
        .maplibregl-ctrl-group button {
          background: transparent !important;
          border-bottom: 1px solid rgba(200, 169, 110, 0.15) !important;
        }
        .maplibregl-ctrl-group button:last-child {
          border-bottom: none !important;
        }
        .maplibregl-ctrl-group button .maplibregl-ctrl-icon {
          filter: invert(1) sepia(1) hue-rotate(15deg) saturate(2.5) brightness(1.05);
        }
        .maplibregl-ctrl-group button:hover {
          background: rgba(200, 169, 110, 0.15) !important;
        }
        .maplibregl-ctrl-attrib {
          background: ${isDark ? "rgba(10,22,40,0.85)" : "rgba(255,255,255,0.85)"} !important;
          color: ${c.textDim} !important;
          font-size: 10px !important;
        }
        .maplibregl-ctrl-attrib a {
          color: ${GOLD} !important;
        }
        /* ZAAHI Premium glass popup — applies to all hover popups
           over DDA projects, free-zones, communities, roads, metro,
           master plans, etc. Single className drives all of them. */
        .zaahi-popup .maplibregl-popup-content {
          background: ${isDark ? "rgba(10, 22, 40, 0.75)" : "rgba(255, 255, 255, 0.72)"} !important;
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          color: ${isDark ? "#f5f1e8" : c.text} !important;
          border: 1px solid rgba(200, 169, 110, 0.25) !important;
          border-radius: 10px;
          padding: 6px 10px;
          font-size: 10px;
          letter-spacing: 0.02em;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        .zaahi-popup .maplibregl-popup-tip {
          border-top-color: rgba(200, 169, 110, 0.4) !important;
          border-bottom-color: rgba(200, 169, 110, 0.4) !important;
        }
        .zaahi-popup .maplibregl-popup-close-button {
          color: ${GOLD} !important;
          font-size: 18px !important;
          padding: 2px 6px !important;
          opacity: 0.7;
          transition: opacity 150ms ease, color 150ms ease;
        }
        .zaahi-popup .maplibregl-popup-close-button:hover {
          opacity: 1;
        }
      `}</style>
      {!selectedParcelId && !selectedVaultEntry && zaahiHover && (() => {
        const title = zaahiHover.projectName || zaahiHover.plotNumber;
        const authority =
          zaahiHover.emirate === "Dubai" ? "DDA"
          : zaahiHover.emirate === "Abu Dhabi" ? "ADDED"
          : "";
        const hasPlotArea = zaahiHover.plotAreaSqft > 0 || zaahiHover.plotAreaSqm > 0;
        const hasGfa = zaahiHover.maxGfaSqft > 0 || zaahiHover.maxGfaSqm > 0;
        const hasFar = zaahiHover.far > 0;
        const hasHeight = !!zaahiHover.maxHeightCode || zaahiHover.maxFloors > 0 || zaahiHover.maxHeightMeters > 0;
        const heightParts: string[] = [];
        if (zaahiHover.maxHeightCode) heightParts.push(zaahiHover.maxHeightCode);
        if (zaahiHover.maxFloors > 0) heightParts.push(`${zaahiHover.maxFloors} floors`);
        if (zaahiHover.maxHeightMeters > 0) heightParts.push(`~${Math.round(zaahiHover.maxHeightMeters)} m`);
        const planDate = formatPlanDate(zaahiHover.planDateIso);
        // Physical status (Under Construction / Completed / etc.) is not
        // stored on Parcel or AffectionPlan today — only Parcel.status
        // (ParcelStatus enum) which is the marketplace listing state, and
        // Building.status (separate table, not joined here). Row omitted
        // until schema gains a physical-status field or Parcel↔Building FK.
        const handleOpenParcel = () => {
          const map = mapRef.current;
          if (!map || !zaahiHover.id) return;
          map.flyTo({
            center: [zaahiHover.lng, zaahiHover.lat],
            zoom: 16, pitch: 45, duration: 2000, essential: true,
          });
          // Mirror HeaderBar Find handshake (page.tsx ~6155) — open the
          // right SidePanel after the camera lands, not during flight.
          window.setTimeout(() => {
            openParcelPanel(zaahiHover.id);
          }, 2000);
          setZaahiHover(null);
        };
        return (
          <Panel
            radius={RADIUS_CARD}
            noShadow
            style={{
              position: "absolute",
              left: zaahiHover.x + 14,
              top: zaahiHover.y + 14,
              width: 260,
              // Gold left-border accent kept — distinguishes ZAAHI
              // listings from PMTiles (blue) and vault (gold variant).
              borderLeft: `3px solid ${GOLD}`,
              boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
              padding: "10px 12px",
              fontSize: 11,
              fontFamily: 'Georgia, "Times New Roman", serif',
              lineHeight: 1.45,
              pointerEvents: "auto",
              cursor: "pointer",
              zIndex: 30,
            }}
            onMouseEnter={() => {
              if (hoverCloseTimerRef.current != null) {
                window.clearTimeout(hoverCloseTimerRef.current);
                hoverCloseTimerRef.current = null;
              }
            }}
            onMouseLeave={() => setZaahiHover(null)}
            onClick={handleOpenParcel}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 700, color: GOLD, fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {title}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {authority && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>{authority}</span>
                )}
                {!!zaahiHover.plotNumber && /^\d{5,10}$/.test(zaahiHover.plotNumber) && (
                  <VaultAddButton
                    plotNumber={zaahiHover.plotNumber}
                    onClick={() => openVaultWizardWith(zaahiHover.plotNumber)}
                  />
                )}
              </span>
            </div>
            {hasPlotArea && (
              <PmtilesHoverRow label="Plot Area"
                value={fmtA(zaahiHover.plotAreaSqft, zaahiHover.plotAreaSqm) ?? "—"} />
            )}
            {hasGfa && (
              <PmtilesHoverRow label="Max GFA"
                value={fmtA(zaahiHover.maxGfaSqft, zaahiHover.maxGfaSqm) ?? "—"} />
            )}
            {hasFar && (
              <PmtilesHoverRow label="FAR" value={zaahiHover.far.toFixed(1)} />
            )}
            {hasHeight && (
              <PmtilesHoverRow label="Max Height" value={heightParts.join(" · ")} />
            )}
            {planDate && (
              <PmtilesHoverRow label="Affection Plan" value={planDate} />
            )}
            {/* Add-to-Vault button moved to the header row (top-right
                "+" icon) as part of the founder spec 2026-05-31. The
                openVaultWizardWith helper handles auth-redirect, popup
                close, and plot pre-fill. */}
          </Panel>
        );
      })()}
      {!selectedParcelId && !selectedVaultEntry && vaultHover && (() => {
        const title = vaultHover.projectName || vaultHover.plotNumber;
        const hasPlotArea = vaultHover.plotAreaSqft > 0 || vaultHover.area > 0;
        const hasGfa = vaultHover.maxGfaSqft > 0;
        const hasFar = vaultHover.far > 0;
        const hasHeight = !!vaultHover.maxHeightCode || vaultHover.maxFloors > 0 || vaultHover.maxHeightMeters > 0;
        const heightParts: string[] = [];
        if (vaultHover.maxHeightCode) heightParts.push(vaultHover.maxHeightCode);
        if (vaultHover.maxFloors > 0) heightParts.push(`${vaultHover.maxFloors} floors`);
        if (vaultHover.maxHeightMeters > 0) heightParts.push(`~${Math.round(vaultHover.maxHeightMeters)} m`);
        const planDate = formatPlanDate(vaultHover.planDateIso);
        const handleOpen = () => {
          if (vaultHover.id) openVaultPanel({ id: vaultHover.id, mode: vaultHover.mode });
          setVaultHover(null);
        };
        return (
          <Panel
            radius={RADIUS_CARD}
            noShadow
            style={{
              position: "absolute",
              left: vaultHover.x + 14,
              top: vaultHover.y + 14,
              width: 260,
              borderLeft: `3px solid ${GOLD}`,
              boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
              padding: "10px 12px",
              fontSize: 11,
              fontFamily: 'Georgia, "Times New Roman", serif',
              lineHeight: 1.45,
              pointerEvents: "auto",
              cursor: "pointer",
              zIndex: 30,
            }}
            onMouseEnter={() => {
              if (hoverCloseTimerRef.current != null) {
                window.clearTimeout(hoverCloseTimerRef.current);
                hoverCloseTimerRef.current = null;
              }
            }}
            onMouseLeave={() => setVaultHover(null)}
            onClick={handleOpen}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 700, color: GOLD, fontSize: 13 }}>
                {title}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)",
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                {vaultHover.mode === "share" ? "SHARED" : "VAULT"}
              </span>
            </div>
            {hasPlotArea && (
              <PmtilesHoverRow label="Plot Area"
                value={fmtA(vaultHover.plotAreaSqft > 0 ? vaultHover.plotAreaSqft : vaultHover.area, null) ?? "—"} />
            )}
            {hasGfa && (
              <PmtilesHoverRow label="Max GFA" value={fmtA(vaultHover.maxGfaSqft, null) ?? "—"} />
            )}
            {hasFar && (
              <PmtilesHoverRow label="FAR" value={vaultHover.far.toFixed(1)} />
            )}
            {hasHeight && (
              <PmtilesHoverRow label="Max Height" value={heightParts.join(" · ")} />
            )}
            {planDate && (
              <PmtilesHoverRow label="Affection Plan" value={planDate} />
            )}
            <PmtilesHoverRow
              label="Asking Price"
              value={fmtPShort(vaultHover.askingAed) ?? "—"}
            />
          </Panel>
        );
      })()}
      {!selectedParcelId && !selectedVaultEntry && ddaLandHover && (() => {
        const m = ddaLandHover.municipality;
        const authority =
          ddaLandHover.source === "dda" ? "DDA"
          : ddaLandHover.source === "ad" && m === "ADM" ? "ADM"
          : ddaLandHover.source === "ad" && m === "AAM" ? "AAM"
          : ddaLandHover.source === "ad" ? "AD"
          : "";
        const status = formatPmtilesStatus(ddaLandHover.status);
        const canAdd = /^\d{5,10}$/.test(ddaLandHover.plotNumber);
        return (
          <Panel
            radius={RADIUS_CARD}
            noShadow
            style={{
              position: "absolute",
              left: ddaLandHover.x + 14,
              top: ddaLandHover.y + 14,
              width: 250,
              // PMTiles plots use a blue left-border accent — visually
              // distinct from the gold-borderLeft ZAAHI listing card.
              borderLeft: "3px solid #4A90D9",
              boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
              padding: "10px 12px",
              fontSize: 11,
              fontFamily: 'Georgia, "Times New Roman", serif',
              lineHeight: 1.45,
              // Interactive: the "+" button needs to receive clicks
              // and the popup needs to survive a brief mouseleave.
              pointerEvents: "auto",
              zIndex: 30,
            }}
            onMouseEnter={() => {
              if (hoverCloseTimerRef.current != null) {
                window.clearTimeout(hoverCloseTimerRef.current);
                hoverCloseTimerRef.current = null;
              }
            }}
            onMouseLeave={() => {
              if (hoverCloseTimerRef.current != null) {
                window.clearTimeout(hoverCloseTimerRef.current);
              }
              hoverCloseTimerRef.current = window.setTimeout(() => {
                setDdaLandHover(null);
                hoverCloseTimerRef.current = null;
              }, 220);
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 700, color: "#4A90D9", fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ddaLandHover.plotNumber || "—"}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {authority && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>{authority}</span>
              )}
              {canAdd && (
                <VaultAddButton
                  plotNumber={ddaLandHover.plotNumber}
                  onClick={() => openVaultWizardWith(ddaLandHover.plotNumber)}
                />
              )}
              </span>
            </div>
            {ddaLandHover.mainLandUse && (
              <div style={{ opacity: 0.78, marginTop: 4, fontSize: 12 }}>
                {ddaLandHover.mainLandUse}
              </div>
            )}
            <PmtilesHoverRow label="Plot Area"
              value={fmtA(ddaLandHover.areaSqft, ddaLandHover.areaSqm) ?? "—"} />
            {ddaLandHover.gfaSqm > 0 && (
              <PmtilesHoverRow label="Max GFA"
                value={fmtA(ddaLandHover.gfaSqft, ddaLandHover.gfaSqm) ?? "—"} />
            )}
            {/* Max Height + Affection Plan rows intentionally omitted —
                neither field is emitted by scripts/prepare-tiles.ts into
                the PMTiles feature properties. To enable: add
                MAX_HEIGHT_FLOORS + MAX_HEIGHT_METERS (read internally
                already) and AFFECTION_PLAN_DATE to baseProps, then
                rebuild via scripts/update-tiles.sh. */}
            {status && <PmtilesHoverRow label="Status" value={status} />}
          </Panel>
        );
      })()}
      {/* The music / sound toggle moved into the HeaderBar (next to
          Profile) per founder spec 2026-04-12. The old floating
          button at top:56 right:16 is gone. */}


      <BuildingCard
        buildingId={selectedBuildingId}
        onClose={() => setSelectedBuildingId(null)}
      />

      {selectedVaultEntry && (
        <VaultSidePanelAdapter
          entryId={selectedVaultEntry.id}
          mode={selectedVaultEntry.mode}
          onClose={() => openVaultPanel(null)}
          mapRef={mapRef}
          width={panelWidth}
          onWidthChange={setPanelWidth}
        />
      )}

      <ArchibaldChat
        hidden={!!selectedParcelId}
        mapControls={mapControls}
        nudge={nudge}
        onAcceptNudge={acceptNudge}
        onDismissNudge={dismissNudge}
      />
      <SidePanel
        parcelId={selectedParcelId}
        mapRef={mapRef}
        onClose={() => {
          sound.swooshClose();
          openParcelPanel(null);
        }}
        width={panelWidth}
        onWidthChange={setPanelWidth}
      />
      {contextLost && <ContextLostOverlay />}
      <WelcomeTour />
      <ParcelsPortalPanel
        open={portalOpen}
        onClose={() => setPortalOpen(false)}
        mapRef={mapRef}
        onSelectParcel={(id) => openParcelPanel(id)}
      />
      <ParcelsNav
        mapRef={mapRef}
        portalOpen={portalOpen}
        onTogglePortal={() => {
          setPortalOpen((o) => !o);
          setLayersOpen(false);
        }}
        selectedParcelId={selectedParcelId}
        selectedVaultEntryId={selectedVaultEntry?.id ?? null}
        vaultOnlyMode={vaultOnlyMode}
        onSelectListing={(id) => openParcelPanel(id)}
        onSelectVaultEntry={(entryId) =>
          openVaultPanel({ id: entryId, mode: "owner" })
        }
      />
      {devModeHero && editingHeroId && (() => {
        const b = HERO_BUILDINGS.find((x) => x.id === editingHeroId);
        if (!b) return null;
        return (
          <HeroBuildingsDevPanel
            building={b}
            override={heroOverrides[editingHeroId]}
            onChange={(next) =>
              setHeroOverrides((prev) => ({ ...prev, [editingHeroId]: next }))
            }
            onReset={() =>
              setHeroOverrides((prev) => {
                const cp = { ...prev };
                delete cp[editingHeroId];
                return cp;
              })
            }
            onClose={() => setEditingHeroId(null)}
          />
        );
      })()}
    </div>
  );
}


export default function ParcelsMapPage() {
  return (
    <AuthGuard>
      <ParcelsMapPageInner />
      {/* Terms-accept gate (first-visit only — persisted in localStorage). */}
      <TermsAcceptModal />
    </AuthGuard>
  );
}
